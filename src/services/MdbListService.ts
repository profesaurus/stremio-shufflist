/**
 * MdbListService.ts
 * 
 * MdbList API Client.
 * 
 * Responsibilities:
 * 1. Fetches items from MdbList lists using the configured API Key.
 * 2. Normalizes MdbList responses into a standard format for the application.
 */
import axios, { AxiosInstance } from 'axios';
import { DEFAULT_ITEM_LIMIT } from '../store/ConfigStore';

export class MdbListService {
    private client: AxiosInstance;
    private apiKey: string = '';

    /**
     * Initializes the MdbListService with an Axios instance and API key.
     */
    constructor() {
        this.client = axios.create({
            baseURL: 'https://api.mdblist.com'
        });

        if (process.env.MDBLIST_KEY) {
            this.setApiKey(process.env.MDBLIST_KEY);
        }
    }

    /**
     * Sets the API key for the MdbListService.
     * @param key The API key to set.
     */
    setApiKey(key: string) {
        this.apiKey = key;
        console.log("MdbList API Key configured");
    }

    /**
     * Fetches items from a MdbList list.
     * @param config The configuration for the list to fetch items from.
     * @param limit The maximum number of items to fetch.
     * @returns A promise that resolves to an array of items.
     */
    async getListItems(config: { listId?: string; username?: string; listName?: string; }, limit: number) {
        if (!this.apiKey) throw new Error('MdbList API Key not set');

        let endpoint = '';

        if (config.listId) {
            endpoint = `/lists/${config.listId}`;
        } else if (config.username && config.listName) {
            endpoint = `/lists/${config.username}/${config.listName}`;
        } else {
            throw new Error("MdbList requires either List ID or Username + List Name");
        }

        try {
            const response = await this.client.get(endpoint, {
                params: { apikey: this.apiKey, json: true }
            });

            let id = response.data[0].id;
            let type = response.data[0].mediatype;

            endpoint = `/lists/${id}/items`;

            const response2 = await this.client.get(endpoint, {
                params: { apikey: this.apiKey, json: true, limit: limit }
            });

            return type === 'movie' ? response2.data.movies : response2.data.shows;
        } catch (e: any) {
            console.error(`MdbList fetch failed for ${endpoint}:`, e.message);
            throw new Error(`Failed to fetch MdbList: ${e.response?.status === 404 ? 'List not found' : e.message}`);
        }
    }
}

export const mdbListService = new MdbListService();
