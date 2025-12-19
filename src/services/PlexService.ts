/**
 * PlexService.ts
 * 
 * Plex Server Integration.
 * 
 * Responsibilities:
 * 1. Connects to a user's Plex server using provided credentials.
 * 2. Fetches available Collections from Movie and TV libraries.
 * 3. Retrieves items from specific Plex collections to use as a source list.
 */

import { ContentType, PlexContentType } from '../store/ConfigStore';
import { MetaPreview } from 'stremio-addon-sdk';
import type { MyPlexAccount, PlexServer, MovieSection, ShowSection } from '@ctrl/plex';

export class PlexService {
    private client?: MyPlexAccount;
    private plex?: PlexServer;

    /**
     * Lazily initialize and return the MyPlexAccount client.
     * Required because @ctrl/plex is an ESM module and we are in a CJS environment.
     */
    private async getClient(): Promise<MyPlexAccount> {
        if (!this.client) {
            // Bypass TSC conversion to require() by using new Function
            // This forces Node.js to use its native ESM import() at runtime
            const dynamicImport = new Function('specifier', 'return import(specifier)');
            const { MyPlexAccount } = await dynamicImport('@ctrl/plex');

            this.client = new MyPlexAccount(
                process.env.PLEX_URL!,
                process.env.PLEX_USERNAME!,
                process.env.PLEX_PASSWORD!,
                process.env.PLEX_TOKEN!
            );
        }
        return this.client!;
    }

    /**
     * Make a connection to Plex
     */
    private async makeConnection() {
        if (this.plex) return this.plex;

        if (process.env.PLEX_SERVER_NAME === undefined) {
            throw new Error("Plex server name not configured");
        }

        const client = await this.getClient();
        const account = await client.connect();
        const resource = await account.resource(process.env.PLEX_SERVER_NAME);
        const plex = await resource.connect();
        this.plex = plex;
        return plex;
    }

    /**
     * Get collections from Plex for the given content type.
     * @param type ContentType (movie or series)
     */
    public async getCollections(type: ContentType): Promise<{ key: string, title: string }[]> {
        console.log(`PlexService: getCollections called for ${type}`);
        if (!process.env.PLEX_URL || !process.env.PLEX_TOKEN) {
            throw new Error("Plex credentials (URL/Token) not configured");
        }
        try {
            this.plex = await this.makeConnection();
            console.log("PlexService: Connection successful");
            const library = await this.plex.library();
            let collections;

            if (type === ContentType.MOVIE) {
                collections = (await library.section<MovieSection>(PlexContentType.MOVIES)).collections();
            } else {
                collections = (await library.section<ShowSection>(PlexContentType.TVSHOWS)).collections();
            }

            return (await collections).map(collection => ({
                key: collection.key,
                title: collection.title || "Unknown"
            }));
        } catch (error) {
            console.error("PlexService: Error getting collections", error);
            throw error;
        }
    }

    /**
     * Get items from a specific Plex collection.
     * @param collectionKey The key/ID of the collection
     * @param limit limit items
     */
    public async getListItems(collectionKey: string, limit: number = 50): Promise<MetaPreview[]> {
        if (!process.env.PLEX_URL || !process.env.PLEX_TOKEN) {
            throw new Error("Plex credentials (URL/Token) not configured");
        }
        this.plex = await this.makeConnection();
        try {
            // We append ?includeGuids=1 to get external IDs (IMDB, TMDB, TVDB)
            const response = await this.plex.query(collectionKey + "?includeGuids=1");
            const items = response.MediaContainer.Metadata || [];

            return items.slice(0, limit).map((item: any) => {
                let id = item.ratingKey; // Default to internal Plex ID

                // Try to find IMDB ID in Guids
                if (item.Guid && Array.isArray(item.Guid)) {
                    const imdbEntry = item.Guid.find((g: any) => g.id && g.id.startsWith('imdb://'));
                    if (imdbEntry) {
                        id = imdbEntry.id.replace('imdb://', '');
                    }
                }

                return {
                    id: id,
                    type: item.type == 'show' ? 'series' : 'movie',
                    name: item.title,
                    description: item.summary
                };
            });
        } catch (error) {
            console.error(`PlexService: Error getting items for collection ${collectionKey}`, error);
            return [];
        }
    }
}

export const plexService = new PlexService();
