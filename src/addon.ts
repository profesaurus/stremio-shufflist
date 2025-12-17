/**
 * addon.ts
 * 
 * Main Entry Point.
 * 
 * Responsibilities:
 * 1. Defines the Stremio Addon builder and interface definition.
 * 2. Sets up the Express server to serve the API and the Web Configuration Dashboard.
 * 3. Mounts the `routes` for the frontend API.
 * 4. Starts the HTTP server.
 */
import 'dotenv/config';
import { addonBuilder } from 'stremio-addon-sdk';
import express from 'express';
import cors from 'cors';
import { manifest } from './manifest';
import { CatalogService } from './services/CatalogService';

const app = express();
app.use(cors());
import path from 'path';
// Serve frontend from 'web' directory relative to current file location (dist or src)
app.use('/web-config', express.static(path.join(__dirname, 'web')));
app.use(express.json());

const builder = new addonBuilder(manifest);

/**
 * Handles catalog requests from Stremio.
 * Fetches items for the requested catalog ID from the CatalogService.
 */
builder.defineCatalogHandler(async (args: any) => {
    console.log('Catalog Request:', args);
    const catalogItems = await CatalogService.getItems(args.id);
    return { metas: catalogItems };
});

const addonInterface = builder.getInterface();

/**
 * GET /manifest.json
 * Returns the dynamic manifest including all configured catalog slots.
 */
app.get('/manifest.json', (req, res) => {
    const dynamicManifest = CatalogService.getManifest();
    res.json(dynamicManifest);
});

/**
 * GET /catalog/:type/:id.json
 * Returns the catalog items for a given type and ID.
 * This is the standard Stremio catalog endpoint.
 */
app.get('/catalog/:type/:id.json', async (req, res) => {
    const { type, id } = req.params;
    const items = await CatalogService.getItems(id);
    res.json({ metas: items });
});

/**
 * GET /catalog/:type/:id/:extra.json
 * Handles catalog requests with extra parameters (like skip/genre).
 * Currently directs to the same content as the base catalog endpoint.
 */
app.get('/catalog/:type/:id/:extra.json', async (req, res) => {
    // Handle extra (skip, search, etc) if needed
    const { type, id } = req.params;
    const items = await CatalogService.getItems(id);
    res.json({ metas: items });
});

// Config API
import apiRouter from './api/routes';
app.use('/api', apiRouter);

const PORT = process.env.PORT || 7000;

import { SchedulerService } from './services/SchedulerService';

/**
 * Initializes Services and Starts the HTTP Server.
 * 1. Loads configuration.
 * 2. Initializes the Scheduler.
 * 3. Starts Express.
 */
CatalogService.loadConfig().then(() => {
    SchedulerService.init();
    app.listen(PORT, () => {
        console.log(`Addon active on port ${PORT}`);
        console.log(`Web UI available at http://localhost:${PORT}/web-config`);
    });
});
