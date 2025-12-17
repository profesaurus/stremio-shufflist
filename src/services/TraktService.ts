/**
 * TraktService.ts
 * 
 * Trakt API Client.
 * 
 * Responsibilities:
 * 1. Fetches User Lists and Trending APIs from Trakt.
 * 2. Handles API authentication (Client ID).
 * 3. Normalizes Trakt responses (movies/shows) into a standard format.
 */
import axios, { AxiosInstance } from 'axios';
import { DEFAULT_ITEM_LIMIT } from '../store/ConfigStore';

export class TraktService {
    private client: AxiosInstance;
    private clientId: string = '';

    /**
     * Initializes the TraktService with an Axios instance and API key.
     */
    constructor() {
        this.client = axios.create({
            baseURL: 'https://api.trakt.tv',
            headers: {
                'Content-Type': 'application/json',
                'trakt-api-version': '2',
                'User-Agent': 'Shufflist/0.0.1'
            }
        });

        if (process.env.TRAKT_CLIENT_ID) {
            this.setCredentials(process.env.TRAKT_CLIENT_ID);
        }
    }

    /**
     * Sets the API key for the TraktService.
     * @param clientId The API key to set.
     */
    setCredentials(clientId: string) {
        this.clientId = clientId;
        this.client.defaults.headers.common['trakt-api-key'] = clientId;
        console.log("Trakt Client ID configured");
    }

    /**
     * Fetches trending movies from Trakt.
     * @returns An array of trending movies.
     */
    async getTrendingMovies() {
        const response = await this.client.get('/movies/trending');
        return response.data;
    }

    /**
     * Fetches items from a Trakt list.
     * @param username The username of the list owner.
     * @param listId The ID of the list.
     * @param limit The maximum number of items to fetch.
     * @returns An array of list items.
     */
    async getListItems(username: string, listId: string, limit: number = DEFAULT_ITEM_LIMIT) {
        // e.g. /users/id/lists/id/items
        const response = await this.client.get(`/users/${username}/lists/${listId}/items`, {
            params: { limit }
        });
        return response.data;
    }

    /**
     * Fetches default lists from Trakt.
     * @param type The type of list to fetch.
     * @param kind The kind of list to fetch (movie or series).
     * @param limit The maximum number of items to fetch.
     * @returns An array of default lists.
     */
    async getDefaultList(type: string, kind: string = 'movie', limit: number = DEFAULT_ITEM_LIMIT) {
        // Map user-friendly types to Trakt API endpoints
        // Types: trending, popular, streaming, favorited, watched
        const base = kind === 'series' ? 'shows' : 'movies';
        let endpoint = `/${base}/trending`;

        switch (type) {
            case 'trending': endpoint = `/${base}/trending`; break;
            case 'popular': endpoint = `/${base}/popular`; break;
            case 'streaming': endpoint = `/${base}/streaming`; break;
            case 'favorited': endpoint = `/${base}/favorited/weekly`; break;
            case 'watched': endpoint = `/${base}/watched/weekly`; break;
            default: endpoint = `/${base}/trending`;
        }

        let params;

        if (type === 'popular') {
            params = { limit: limit, extended: 'full', years: '1970-2025' };
        }
        else {
            params = { limit: limit, extended: 'full' };
        }

        console.log(`Fetching Default Trakt List: ${type} (${kind}) -> ${endpoint}`);
        const response = await this.client.get(endpoint, {
            params: params
        });
        return response.data;
    }

    /**
     * Searches for lists on Trakt.
     * @param query The search query.
     * @returns An array of search results.
     */
    async searchLists(query: string) {
        const response = await this.client.get(`/search/list`, {
            params: { query }
        });
        return response.data;
    }
}

export const traktService = new TraktService();
