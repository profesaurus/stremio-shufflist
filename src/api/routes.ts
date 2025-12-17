/**
 * routes.ts
 * 
 * Express API Routes.
 * 
 * Responsibilities:
 * 1. Defines the REST API endpoints for the Frontend UI.
 * 2. Routes requests to appropriate Services (List, Catalog, Plex, etc.).
 * 3. Handles status checks and triggering of refreshing/maintenance tasks.
 */
import { Router } from 'express';
import { CatalogService } from '../services/CatalogService';
import { ListService } from '../services/ListService';
import { ConfigStore, DEFAULT_ITEM_LIMIT, ContentType } from '../store/ConfigStore';
import { SchedulerService } from '../services/SchedulerService';
import { plexService } from '../services/PlexService';

const router = Router();

// --- Settings ---


/**
 * GET /status
 * Returns the current status of the scheduler, including last run time and next invocation time.
 */
router.get('/status', (req, res) => {
    res.json({
        lastRunTime: SchedulerService.getLastRunTime(),
        nextRunTime: SchedulerService.getNextInvocation()
    });
});

/**
 * GET /settings
 * Returns the current application settings.
 */
router.get('/settings', (req, res) => {
    res.json(ConfigStore.getSettings());
});

/**
 * POST /settings
 * Updates application settings such as refresh interval and default item limit.
 */
router.post('/settings', async (req, res) => {
    try {
        const { refreshIntervalHours, defaultItemLimit } = req.body;

        const updates: any = {};

        // Validate hours
        if (refreshIntervalHours !== undefined) {
            const hours = parseInt(refreshIntervalHours, 10);
            if (isNaN(hours) || hours < 0) {
                res.status(400).json({ error: "Invalid interval. Must be a positive number." });
                return;
            }
            updates.refreshIntervalHours = hours;
            SchedulerService.updateSchedule(hours);
        }

        // Validate limit
        if (defaultItemLimit !== undefined) {
            const limit = parseInt(defaultItemLimit, 10);
            if (isNaN(limit) || limit < 1 || limit > 1000) {
                res.status(400).json({ error: "Invalid limit. Must be between 1 and 1000." });
                return;
            }
            updates.defaultItemLimit = limit;
        }

        const newSettings = await ConfigStore.updateSettings(updates);
        res.json({ success: true, settings: newSettings });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- Lists ---

/**
 * GET /lists
 * Retrieves all configured source lists.
 */
router.get('/lists', (req, res) => {
    res.json(ListService.getLists());
});

/**
 * POST /lists
 * Adds a new source list configuration.
 */
router.post('/lists', async (req, res) => {
    try {
        const list = req.body; // alias, type, config
        const newList = await ListService.addList(list);
        res.json(newList);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * PUT /lists/:id
 * Updates an existing source list configuration by ID.
 */
router.put('/lists/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        await ListService.updateList(id, updates);
        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /lists/:id
 * Deletes a source list by ID.
 */
router.delete('/lists/:id', (req, res) => {
    ListService.deleteList(req.params.id);
    res.json({ success: true });
});

// --- Slots ---

/**
 * GET /slots
 * Retrieves all configured catalog slots.
 */
router.get('/slots', (req, res) => {
    res.json(CatalogService.getSlots());
});

/**
 * POST /slots
 * Creates a new catalog slot.
 */
router.post('/slots', async (req, res) => {
    const { alias, type } = req.body;
    const newSlot = await CatalogService.addSlot(alias, type || 'movie');
    res.json(newSlot);
});

/**
 * PUT /slots/:id
 * Updates an existing catalog slot configuration and optionally triggers a refresh.
 */
router.put('/slots/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const result = await CatalogService.updateSlot(id, updates);
    res.json({ success: true, refreshResult: result });
});

/**
 * DELETE /slots/:id
 * Deletes a catalog slot by ID.
 */
router.delete('/slots/:id', (req, res) => {
    const { id } = req.params;
    CatalogService.deleteSlot(id);
    res.json({ success: true });
});

/**
 * POST /slots/refresh-all
 * Triggers a refresh for all catalog slots.
 */
router.post('/slots/refresh-all', async (req, res) => {
    const results = await CatalogService.refreshAllSlots();
    res.json({ success: true, results });
});

/**
 * POST /slots/:id/refresh
 * Triggers a manual refresh for a specific catalog slot.
 */
router.post('/slots/:id/refresh', async (req, res) => {
    const { id } = req.params;
    const result = await CatalogService.refreshSlot(id);
    res.json(result || { success: false, error: "Unknown error" });
});

// --- Plex ---

/**
 * GET /plex/collections
 * Fetches available collections from the configured Plex server (Movies or TV).
 */
router.get('/plex/collections', async (req, res) => {
    try {
        const type = req.query.type as any || ContentType.MOVIE;
        console.log(`API: Received request for Plex collections. Type: ${type}`);
        const cols = await plexService.getCollections(type);
        console.log(`API: Got ${cols.length} collections`);
        res.json(cols);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
