/**
 * RpdbService.ts
 * 
 * Logic for Rating Poster Database integration.
 */

export class RpdbService {

    /**
     * Replaces the posters in the given item list with RPDB posters if configured.
     * @param items The array of meta items (must have 'id' and 'type').
     * @returns The items with updated poster URLs.
     */
    static enrichItems(items: any[]): any[] {
        const apiKey = process.env.RPDB_KEY;
        if (!apiKey) return items;

        return items.map(item => {
            // Only enrich if we have a valid IMDB ID (tt...)
            if (item.id && typeof item.id === 'string' && item.id.startsWith('tt')) {
                // RPDB URL Format: https://api.ratingposterdb.com/{apikey}/{mediaType}/{id}.jpg
                // We use .jpg for Stremio compatibility
                const rpdbPoster = `https://api.ratingposterdb.com/${apiKey}/imdb/poster-default/${item.id}.jpg`;

                return {
                    ...item,
                    poster: rpdbPoster
                };
            }
            return item;
        });
    }
}
