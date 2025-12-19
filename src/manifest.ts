import { Manifest } from 'stremio-addon-sdk';

export const manifest: Manifest = {
    id: 'org.stremio.shufflist',
    version: '1.0.0',
    name: 'Shufflist',
    description: 'Create dynamic catalogs that automatically rotate through your favorite lists from Trakt, MdbList, IMDB, and Plex. Features smart shuffling, auto-refresh scheduling, group exclusivity, and RPDB poster integration.',
    resources: ['catalog'],
    types: ['movie', 'series'],
    catalogs: [], // Start empty, populated dynamically
    idPrefixes: ['tt']
};
