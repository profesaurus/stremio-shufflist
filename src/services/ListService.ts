/**
 * ListService.ts
 * 
 * Source List Management Logic.
 * 
 * Responsibilities:
 * 1. Validates external lists (Trakt, MdbList) to ensure they are accessible.
 * 2. Handles CRUD operations for Source Lists (Add, Update, Delete).
 * 3. Ensures constraints (e.g., auto-adding new lists to "Select All" slots) are met.
 * 4. Triggers `CatalogService` to refresh slots when their underlying lists change.
 */
import { ConfigStore, SourceType, ContentType, SourceList, DEFAULT_ITEM_LIMIT } from '../store/ConfigStore';
import { traktService } from './TraktService';
import { mdbListService } from './MdbListService';
import { plexService } from './PlexService';
import { imdbService } from './ImdbService';
import { CatalogService } from './CatalogService';

export class ListService {

    /**
     * Retrieves all lists from the configuration store.
     * @returns An array of all lists.
     */
    static getLists() {
        return ConfigStore.getLists();
    }

    /**
     * Validates a source list by fetching its items.
     * @param list The source list to validate.
     * @returns A promise that resolves when the list is validated.
     */
    static async validateList(list: Omit<SourceList, 'id'>) {
        try {
            const limit = list.limit || DEFAULT_ITEM_LIMIT;
            if (list.type === SourceType.TRAKT_USER_LIST) {
                if (!list.config.username || !list.config.listId) throw new Error("Missing Trakt credentials");
                await traktService.getListItems(list.config.username, list.config.listId, limit);
            } else if (list.type === SourceType.MDBLIST_LIST) {
                // Pass full config to service for validation
                await mdbListService.getListItems({ ...list.config }, limit);
            } else if (list.type === SourceType.DEFAULT_LIST) {
                if (list.config.listType === 'imdb_top') {
                    if ((list.contentType || ContentType.MOVIE) === ContentType.MOVIE) {
                        await imdbService.getTop250Movies();
                    } else {
                        await imdbService.getTop250Series();
                    }
                } else {
                    await traktService.getDefaultList(list.config.listType, list.contentType || ContentType.MOVIE, limit);
                }
            } else if (list.type === SourceType.PLEX_COLLECTION) {
                if (!list.config.collectionId) throw new Error("Missing Plex Collection ID");
                // Validate availability by fetching 1 item
                await plexService.getListItems(list.config.collectionId, 1);
            }
            // trakt_trending is always valid
            return true;
        } catch (error: any) {
            console.error(`Validation failed for list ${list.alias}:`, error.message);
            throw new Error(`Could not access list: ${error.message}`);
        }
    }

    /**
     * Adds a new list to the configuration store.
     * @param list The source list to add.
     * @returns The newly added list object.
     */
    static async addList(list: Omit<SourceList, 'id'>) {
        // Validate first
        await this.validateList(list);

        const newList: SourceList = { ...list, id: Date.now().toString() };
        const data = ConfigStore.getData();

        // Find slots that MATCH the content type (default to 'movie' if undefined)
        const newType = newList.contentType || ContentType.MOVIE;

        // precise logic: "catalogs that have all possible lists for their type selected"
        // Get all lists of this type BEFORE adding the new one
        const existingListsOfType = data.lists.filter(l => (l.contentType || ContentType.MOVIE) === newType);
        const existingListIds = existingListsOfType.map(l => l.id);

        data.lists.push(newList);

        // Find matching slots
        const matchingSlots = data.slots.filter(s => (s.type || ContentType.MOVIE) === newType);

        // Auto-add new list only to slots that had ALL existing lists selected
        matchingSlots.forEach(slot => {
            const hasAllExisting = existingListIds.every(id => slot.listIds.includes(id));
            if (hasAllExisting) {
                if (!slot.listIds.includes(newList.id)) {
                    slot.listIds.push(newList.id);
                }
            }
        });

        await ConfigStore.saveConfig();
        return newList;
    }

    /**
     * Updates an existing list in the configuration store.
     * @param id The ID of the list to update.
     * @param updates The updates to apply to the list.
     * @returns The updated list object.
     */
    static async updateList(id: string, updates: Partial<SourceList>) {
        const data = ConfigStore.getData();
        const list = data.lists.find(l => l.id === id);

        if (list) {
            // Validate if config/type changes
            if (updates.config || updates.type) {
                const candidate = { ...list, ...updates } as SourceList;
                await this.validateList(candidate);
            }

            Object.assign(list, updates);
            await ConfigStore.saveConfig();

            // Propagate updates to any slots currently using this list
            const slotsUsingList = data.slots.filter(s => s.currentSelection?.sourceId === id);
            if (slotsUsingList.length > 0) {
                console.log(`Updating ${slotsUsingList.length} slots that use list ${list.alias}`);
                for (const slot of slotsUsingList) {
                    await CatalogService.refreshSlot(slot.id);
                }
            }
        }
        return list;
    }

    /**
     * Deletes a list from the configuration store.
     * @param id The ID of the list to delete.
     */
    static deleteList(id: string) {
        const data = ConfigStore.getData();
        data.lists = data.lists.filter(l => l.id !== id);

        // Remove this ID from any slot.listIds
        data.slots.forEach(slot => {
            slot.listIds = slot.listIds.filter(lid => lid !== id);
        });

        ConfigStore.saveConfig();
    }
}
