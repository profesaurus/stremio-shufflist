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
import { MyPlexAccount, PlexServer, MovieSection, ShowSection } from '@ctrl/plex';

export class PlexService {
    private client: MyPlexAccount;
    private plex?: PlexServer;

    /**
     * Initializes the PlexService with Plex credentials.
     */
    constructor() {
        if (process.env.PLEX_URL === undefined || process.env.PLEX_USERNAME === undefined || process.env.PLEX_PASSWORD === undefined || process.env.PLEX_TOKEN === undefined) {
            throw new Error("Plex credentials not configured");
        }

        this.client = new MyPlexAccount(process.env.PLEX_URL, process.env.PLEX_USERNAME, process.env.PLEX_PASSWORD, process.env.PLEX_TOKEN);
    }

    /**
     * Make a connection to Plex
     */
    private async makeConnection() {

        if (process.env.PLEX_SERVER_NAME === undefined) {
            throw new Error("Plex server name not configured");
        }

        const account = await this.client.connect();
        const resource = await account.resource(process.env.PLEX_SERVER_NAME);
        const plex = await resource.connect();
        return plex;
    }

    /**
     * Get collections from Plex for the given content type.
     * @param type ContentType (movie or series)
     */
    public async getCollections(type: ContentType): Promise<{ key: string, title: string }[]> {
        console.log(`PlexService: getCollections called for ${type}`);
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
                    type: item.type,
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
