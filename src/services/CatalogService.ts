/**
 * CatalogService.ts
 * 
 * Stremio Catalog Logic & Presentation.
 * 
 * Responsibilities:
 * 1. Generates the Stremio Manifest dynamically based on configured Slots.
 * 2. Handles the implementation of `getItems` for Stremio requests.
 * 3. Manages the "REFRESH" logic: selecting a random list for a slot, fetching its items, 
 *    and pre-pending the header item.
 * 4. Coordinates with `ConfigStore` to read slot configuration.
 */
import { Manifest, MetaPreview } from 'stremio-addon-sdk';
import { manifest } from '../manifest';
import { traktService } from './TraktService';
import { mdbListService } from './MdbListService';
import { plexService } from './PlexService';
import { imdbService } from './ImdbService';
import { ConfigStore, CatalogSlot, SourceType, ContentType, SourceList, DEFAULT_ITEM_LIMIT } from '../store/ConfigStore';

export class CatalogService {

    /**
     * Loads the configuration from the config store.
     * @returns The loaded configuration object.
     */
    static loadConfig() { return ConfigStore.loadConfig(); }

    /**
     * Saves the configuration to the config store.
     * @returns A promise that resolves when the configuration is saved.
     */
    static saveConfig() { return ConfigStore.saveConfig(); }

    /**
     * Generates the Stremio manifest dynamically based on configured slots.
     * @returns The generated manifest object.
     */
    static getManifest(): Manifest {
        const dynamicCatalogs = ConfigStore.getSlots().map(slot => ({
            id: `cat_${slot.id}`,
            type: slot.type || ContentType.MOVIE,
            name: slot.alias,
            extra: [{ name: 'skip' }]
        }));

        return {
            ...manifest,
            catalogs: [...(manifest.catalogs || []), ...dynamicCatalogs]
        };
    }

    /**
     * Retrieves the items for a specific catalog.
     * @param catalogId The ID of the catalog to retrieve items for.
     * @returns A promise that resolves to an array of meta previews.
     */
    static async getItems(catalogId: string): Promise<MetaPreview[]> {
        const slotId = catalogId.replace('cat_', '');
        const slot = ConfigStore.getSlots().find(s => s.id === slotId);
        if (!slot || !slot.currentSelection) return [];
        return slot.currentSelection.items;
    }

    /**
     * Refreshes a specific slot by selecting a random list and fetching its items.
     * @param slotId The ID of the slot to refresh.
     * @returns A promise that resolves to an object containing the refresh results.
     */
    static async refreshSlot(slotId: string) {
        const slot = ConfigStore.getSlots().find(s => s.id === slotId);
        const lists = ConfigStore.getLists();
        if (!slot) return;

        // Filter valid lists from IDs AND content type
        const slotType = slot.type || ContentType.MOVIE;
        const availableLists = lists.filter(l =>
            slot.listIds.includes(l.id) &&
            (l.contentType || ContentType.MOVIE) === slotType
        );

        if (availableLists.length === 0) {
            console.warn(`Slot ${slot.alias} (${slotType}) has no available lists to choose from.`);
            return;
        }

        // --- Unique List & Group Logic ---

        // 1. Identify what is currently active in OTHER slots
        const otherActiveSelections = ConfigStore.getSlots()
            .filter(s => s.id !== slotId && s.currentSelection?.sourceId)
            .map(s => {
                const list = lists.find(l => l.id === s.currentSelection!.sourceId);
                return {
                    id: s.currentSelection!.sourceId!,
                    group: list?.group
                };
            });

        const activeListIds = otherActiveSelections.map(x => x.id);
        // Get set of active groups (filtering out undefined/empty groups)
        const activeGroups = new Set(otherActiveSelections.map(x => x.group).filter(g => g));

        // 2. Filter candidates
        // Rule A: Don't pick the exact same list that is active elsewhere
        // Rule B: Don't pick a list if its group is already active elsewhere
        const candidates = availableLists.filter(l => {
            if (activeListIds.includes(l.id)) return false; // Rule A
            if (l.group && activeGroups.has(l.group)) return false; // Rule B
            return true;
        });

        if (candidates.length === 0) {
            console.warn(`Slot ${slot.alias} has no lists available after enforcing exclusivity rules. Defaulting to standard pool.`);
        }

        const selectionPool = candidates.length > 0 ? candidates : availableLists;

        // Retry logic variables
        const pool = [...selectionPool];
        let attempts = 0;
        let lastError = '';
        let firstFailedName = '';
        let firstFailReason = '';

        while (pool.length > 0) {
            const randomIndex = Math.floor(Math.random() * pool.length);
            const randomList = pool[randomIndex];

            console.log(`Refreshing slot ${slot.alias} trying list ${randomList.alias} (Pool: ${pool.length})`);

            try {
                const { items, listName } = await this.fetchListItems(randomList);

                // Allow empty lists, but flag them
                const isEmpty = items.length === 0;

                // Create Header Item
                const headerItem = this.createHeaderItem(slot, listName);
                items.unshift(headerItem);

                slot.currentSelection = {
                    name: listName,
                    sourceType: randomList.type,
                    sourceId: randomList.id,
                    items: items
                };

                console.log(`Slot ${slot.alias} updated with ${items.length - 1} items from ${listName}`);
                await ConfigStore.saveConfig();

                return {
                    success: true,
                    listName,
                    retried: attempts > 0,
                    isEmpty,
                    failedListName: firstFailedName,
                    failReason: firstFailReason
                };

            } catch (error: any) {
                console.error(`Failed to fetch list ${randomList.alias}: ${error.message}`);

                // Capture first failure details
                if (attempts === 0) {
                    lastError = error.message;
                    firstFailedName = randomList.alias;
                    firstFailReason = this.formatFailReason(error.message);
                }

                pool.splice(randomIndex, 1); // remove failed list
                attempts++;
            }
        }

        console.error(`Slot ${slot.alias} failed to refresh after trying all available lists.`);
        return { success: false, error: lastError || "All lists failed" };
    }

    /**
     * Fetches items from a source list.
     * @param list The source list to fetch items from.
     * @returns A promise that resolves to an object containing the items and list name.
     */
    private static async fetchListItems(list: SourceList): Promise<{ items: any[], listName: string }> {
        let items: any[] = [];
        let listName = 'Random List';
        const limit = list.limit || DEFAULT_ITEM_LIMIT;

        if (list.type === SourceType.TRAKT_USER_LIST) {
            const { username, listId } = list.config;
            listName = list.alias; // Use alias for user lists
            const listItems = await traktService.getListItems(username, listId, limit);
            items = listItems.map((i: any) => ({
                id: i.movie?.ids?.imdb || i.show?.ids?.imdb || '',
                type: i.type === 'show' ? ContentType.SERIES : i.type,
                name: i.movie?.title || i.show?.title,
                poster: i.movie?.images?.poster?.[0] || '',
                description: i.movie?.overview || i.show?.overview
            })).filter((i: any) => i.id);
        } else if (list.type === SourceType.DEFAULT_LIST) {
            const listType = list.config.listType || 'trending';

            if (listType === 'imdb_top') {
                const kindLabel = list.contentType === ContentType.SERIES ? 'Series' : 'Movies';
                listName = `IMDB Top 250 ${kindLabel}`;

                let imdbItems = [];
                if ((list.contentType || ContentType.MOVIE) === ContentType.MOVIE) {
                    imdbItems = await imdbService.getTop250Movies();
                } else {
                    imdbItems = await imdbService.getTop250Series();
                }

                // Limit items
                items = imdbItems.slice(0, limit);
            } else {
                // Standard Trakt
                const rawItems = await traktService.getDefaultList(listType, list.contentType || ContentType.MOVIE, limit);
                const kindLabel = list.contentType === ContentType.SERIES ? 'Series' : 'Movies';
                listName = `${list.config.listTypeLabel || 'List'}`;

                items = rawItems.map((i: any) => {
                    const item = i.movie || i.show || i;
                    return {
                        id: item.ids?.imdb || '',
                        type: item.title === 'show' ? ContentType.SERIES : ContentType.MOVIE,
                        name: item.title,
                        description: item.overview || ''
                    };
                }).filter((i: any) => i.id);
            }

        } else if (list.type === SourceType.MDBLIST_LIST) {
            // Pass full config (might contain listId, or username/listName)
            const listData = await mdbListService.getListItems(list.config, limit);
            listName = list.alias; // Use alias for user lists
            items = listData.map((i: any) => ({
                id: i.imdb_id,
                type: i.mediatype === 'show' ? ContentType.SERIES : i.mediatype,
                name: i.title,
                poster: i.poster,
                description: i.description || ''
            }));
        } else if (list.type === SourceType.PLEX_COLLECTION) {
            items = await plexService.getListItems(list.config.collectionId, limit);
            listName = list.alias; // Use user-defined alias
        }

        if (list.shuffle) {
            // Fisher-Yates Shuffle
            for (let i = items.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [items[i], items[j]] = [items[j], items[i]];
            }
        }

        return { items, listName };
    }

    /**
     * Creates a header item for a catalog slot.
     * @param slot The catalog slot to create a header for.
     * @param listName The name of the list to display in the header.
     * @returns The header item object.
     */
    private static createHeaderItem(slot: CatalogSlot, listName: string) {
        return {
            id: `shufflist_header_${slot.id}_${Date.now()}`,
            type: ContentType.MOVIE,
            name: listName,
            description: `Currently displaying: ${listName}`,
            poster: `https://placehold.co/600x900/7B5BF5/ffffff/png?text=${encodeURIComponent(listName.split(" ").join("\n"))}&font=PT Sans`,
            background: ''
        };
    }

    /**
     * Formats a failure reason based on the error message.
     * @param message The error message to format.
     * @returns A formatted failure reason.
     */
    private static formatFailReason(message: string): string {
        if (message.includes("404")) return "not found";
        if (message.includes("401") || message.includes("403")) return "access denied";
        if (message.includes("empty")) return "was empty";
        if (message.includes("Missing")) return "invalid config";
        return "unreachable";
    }

    /**
     * Refreshes all slots in the configuration store.
     * @returns An array of refresh results for each slot.
     */
    static async refreshAllSlots() {
        console.log("Refreshing ALL slots...");
        const validSlots = ConfigStore.getSlots().filter(s => s.listIds.length > 0);

        // Sort by least number of available lists first to prioritize restricted slots
        validSlots.sort((a, b) => a.listIds.length - b.listIds.length);

        // Clear all current selections first so they don't influence the random selection of earlier slots
        // This ensures the exclusivity logic works on a "blank slate" for the batch
        validSlots.forEach(s => s.currentSelection = undefined);

        const results = [];
        for (const slot of validSlots) {
            const result = await this.refreshSlot(slot.id);
            results.push({ ...result, slotId: slot.id });
        }
        return results;
    }

    /**
     * Retrieves all slots from the configuration store.
     * @returns An array of all slots.
     */
    static getSlots() { return ConfigStore.getSlots(); }

    /**
     * Adds a new slot with the specified alias and type.
     * @param alias The alias for the new slot.
     * @param type The type of the new slot (MOVIE or SERIES).
     * @returns The newly created slot object.
     */
    static async addSlot(alias: string, type: ContentType = ContentType.MOVIE) {
        // Default to selecting ALL current lists OF MATCHING TYPE
        const matchingLists = ConfigStore.getLists().filter(l => (l.contentType || ContentType.MOVIE) === type);
        const allListIds = matchingLists.map(l => l.id);

        const newSlot: CatalogSlot = {
            id: Date.now().toString(),
            alias,
            type,
            listIds: allListIds
        };
        ConfigStore.getSlots().push(newSlot);
        await ConfigStore.saveConfig();

        // Auto-refresh the new slot so it's not empty
        await this.refreshSlot(newSlot.id);

        return newSlot;
    }

    /**
     * Updates a slot's configuration.
     * @param id The ID of the slot to update.
     * @param updates The partial updates to apply to the slot.
     * @returns The updated slot object.
     */
    static async updateSlot(id: string, updates: Partial<CatalogSlot>): Promise<any> {
        const slot = ConfigStore.getSlots().find(s => s.id === id);
        if (slot) {
            if (updates.alias) slot.alias = updates.alias;

            let shouldRefresh = false;

            if (updates.listIds) {
                slot.listIds = updates.listIds;
                // Check if current selection is still valid
                if (slot.currentSelection?.sourceId && !slot.listIds.includes(slot.currentSelection.sourceId)) {
                    shouldRefresh = true;
                }
            }

            if (updates.type) slot.type = updates.type;

            await ConfigStore.saveConfig();

            if (shouldRefresh) {
                console.log(`Slot ${slot.alias} current selection removed. Refreshing...`);
                return await this.refreshSlot(slot.id);
            }
        }
        return null;
    }

    /**
     * Deletes a slot and its associated data.
     * @param id The ID of the slot to delete.
     */
    static deleteSlot(id: string) {
        const data = ConfigStore.getData();
        data.slots = data.slots.filter(s => s.id !== id);
        ConfigStore.saveConfig();
    }
}
