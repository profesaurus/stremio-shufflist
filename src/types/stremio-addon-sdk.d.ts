declare module 'stremio-addon-sdk' {
    export class addonBuilder {
        constructor(manifest: any);
        defineCatalogHandler(handler: (args: any) => Promise<any>): void;
        defineStreamHandler(handler: (args: any) => Promise<any>): void;
        defineMetaHandler(handler: (args: any) => Promise<any>): void;
        defineMetaHandler(handler: (args: any) => Promise<any>): void;
        getInterface(): any;
    }

    export interface Manifest {
        id: string;
        version: string;
        name: string;
        description: string;
        resources: string[];
        types: string[];
        catalogs: any[];
        idPrefixes?: string[];
        [key: string]: any;
    }

    export interface MetaPreview {
        id: string;
        type: string;
        name: string;
        poster?: string;
        description?: string;
        [key: string]: any;
    }
}
