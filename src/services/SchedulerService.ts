/**
 * SchedulerService.ts
 * 
 * Manages background cron jobs.
 * 
 * Responsibilities:
 * 1. Initializes the auto-refresh schedule based on configuration.
 * 2. Updates the schedule dynamically when settings change.
 * 3. Invokes `CatalogService.refreshAllSlots` on the scheduled interval.
 */
import schedule from 'node-schedule';
import { ConfigStore } from '../store/ConfigStore';
import { CatalogService } from './CatalogService';

export class SchedulerService {
    private static job: schedule.Job | null = null;

    /**
     * Initializes the scheduler with the auto-refresh schedule based on configuration.
     */
    static init() {
        const settings = ConfigStore.getSettings();
        console.log(`[Scheduler] Initializing. Settings:`, settings);
        if (settings && settings.refreshIntervalHours > 0) {
            this.startSchedule(settings.refreshIntervalHours);
        } else {
            console.log("Auto-refresh is disabled on startup.");
        }
    }

    /**
     * Updates the auto-refresh schedule dynamically when settings change.
     * @param intervalHours The new interval in hours.
     */
    static updateSchedule(intervalHours: number) {
        if (this.job) {
            this.job.cancel();
            this.job = null;
            console.log("Existing auto-refresh schedule cancelled.");
        }

        if (intervalHours > 0) {
            this.startSchedule(intervalHours);
        } else {
            console.log("Auto-refresh disabled.");
        }
    }

    private static lastRunTime: number = 0;

    /**
     * Gets the last run time of the auto-refresh schedule.
     * @returns The last run time in milliseconds since the epoch.
     */
    static getLastRunTime(): number {
        return this.lastRunTime;
    }

    /**
     * Gets the next invocation time of the auto-refresh schedule.
     * @returns The next invocation time in milliseconds since the epoch, or null if the schedule is not running.
     */
    static getNextInvocation(): number | null {
        if (!this.job) return null;
        const next = this.job.nextInvocation();
        return next ? next.getTime() : null;
    }

    /**
     * Starts the auto-refresh schedule.
     * @param intervalHours The interval in hours.
     */
    private static startSchedule(intervalHours: number) {
        console.log(`Starting auto-refresh schedule: Every ${intervalHours} hours.`);

        // Run at second 0, minute 0, past every Nth hour
        const cronExpression = `0 0 */${intervalHours} * * *`;

        try {
            this.job = schedule.scheduleJob(cronExpression, async () => {
                console.log(`[Scheduler] Auto-refreshing all slots (Interval: ${intervalHours}h)...`);
                await CatalogService.refreshAllSlots();
                this.lastRunTime = Date.now();
            });
            console.log(`Scheduled job created with expression: ${cronExpression}`);
        } catch (e) {
            console.error("Failed to schedule job", e);
        }
    }
}
