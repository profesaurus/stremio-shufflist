/**
 * ConfigStore.ts
 * 
 * Centralized Data Store and Persistence Layer.
 * 
 * Responsibilities:
 * 1. Defines the core data models (`SourceList`, `CatalogSlot`).
 * 2. Manages the shared state of the application.
 * 3. Handles reading from and writing to the `config/data.json` persistence file.
 * 4. Acts as the Single Source of Truth for both `ListService` and `CatalogService`.
 */
import * as fs from 'fs';
import * as path from 'path';
import { manifest } from '../manifest';
import { Manifest, MetaPreview } from 'stremio-addon-sdk';

// Enums
export enum SourceType {
    TRAKT_USER_LIST = 'trakt_user_list',
    DEFAULT_LIST = 'default_list', // New generic default list
    MDBLIST_LIST = 'mdblist_list',
    PLEX_COLLECTION = 'plex_collection'
}

export enum ContentType {
    MOVIE = 'movie',
    SERIES = 'series'
}

export enum PlexContentType {
    MOVIES = "Movies",
    TVSHOWS = "TV Shows"
}

// Constants
export const DEFAULT_ITEM_LIMIT = 50;
export const DEFAULT_REFRESH_INTERVAL_HOURS = 24;

// Interfaces
export interface SourceList {
    id: string;
    alias: string;
    type: SourceType;
    contentType: ContentType;
    config: Record<string, any>;
    shuffle?: boolean; // If true, items are randomized on fetch
    limit?: number; // Max items to fetch
}

export interface CatalogSlot {
    id: string;
    alias: string;
    type: ContentType;
    listIds: string[]; // Referenced IDs
    currentSelection?: {
        name: string;
        sourceType: string;
        sourceId?: string;
        items: MetaPreview[];
    };
}

export interface AppSettings {
    refreshIntervalHours: number; // 0 = disabled
    defaultItemLimit?: number;
}

export interface ConfigData {
    lists: SourceList[];
    slots: CatalogSlot[];
    settings: AppSettings;
}

const CONFIG_PATH = path.join(process.cwd(), 'config', 'data.json');

export class ConfigStore {
    private static data: ConfigData = {
        lists: [],
        slots: [],
        settings: { refreshIntervalHours: DEFAULT_REFRESH_INTERVAL_HOURS, defaultItemLimit: DEFAULT_ITEM_LIMIT }
    };

    /**
     * Gets the current configuration data.
     * @returns The configuration data.
     */
    static getData(): ConfigData {
        return this.data;
    }

    /**
     * Gets the current application settings.
     * @returns The application settings.
     */
    static getSettings(): AppSettings {
        return this.data.settings;
    }

    /**
     * Updates the application settings.
     * @param newSettings The new settings to apply.
     * @returns The updated application settings.
     */
    static async updateSettings(newSettings: Partial<AppSettings>) {
        this.data.settings = { ...this.data.settings, ...newSettings };
        await this.saveConfig();
        return this.getSettings();
    }

    /**
     * Gets the current lists.
     * @returns The lists.
     */
    static getLists(): SourceList[] {
        return this.data.lists;
    }

    /**
     * Gets the current slots.
     * @returns The slots.
     */
    static getSlots(): CatalogSlot[] {
        return this.data.slots;
    }

    /**
     * Loads the configuration from the persistence file.
     */
    static async loadConfig() {
        if (fs.existsSync(CONFIG_PATH)) {
            try {
                const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
                const json = JSON.parse(raw);
                this.data = {
                    lists: Array.isArray(json.lists) ? json.lists : [],
                    slots: Array.isArray(json.slots) ? json.slots : [],
                    settings: json.settings || { refreshIntervalHours: DEFAULT_REFRESH_INTERVAL_HOURS, defaultItemLimit: DEFAULT_ITEM_LIMIT }
                };

                if (this.data.settings.refreshIntervalHours === undefined) {
                    this.data.settings.refreshIntervalHours = DEFAULT_REFRESH_INTERVAL_HOURS;
                }

                if (this.data.settings.defaultItemLimit === undefined) {
                    this.data.settings.defaultItemLimit = DEFAULT_ITEM_LIMIT;
                }

                this.updateSettings(this.data.settings);
            } catch (e) {
                console.error("Error loading config", e);
                this.data = { lists: [], slots: [], settings: { refreshIntervalHours: DEFAULT_REFRESH_INTERVAL_HOURS, defaultItemLimit: DEFAULT_ITEM_LIMIT } };
            }
        }
    }

    /**
     * Saves the configuration to the persistence file.
     */
    static async saveConfig() {
        try {
            if (!fs.existsSync(path.dirname(CONFIG_PATH))) {
                fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
            }
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.data, null, 2));
        } catch (e) {
            console.error("Error saving config", e);
        }
    }
}
