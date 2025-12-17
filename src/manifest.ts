import { Manifest } from 'stremio-addon-sdk';

export const manifest: Manifest = {
    id: 'org.stremio.shufflist',
    version: '1.0.0',
    name: 'Shufflist',
    description: 'This project is an addon for Stremio that gives the appearance of catalogs shuffling their order in Stremio.',
    resources: ['catalog'],
    types: ['movie', 'series'],
    catalogs: [], // Start empty, populated dynamically
    idPrefixes: ['tt']
};
