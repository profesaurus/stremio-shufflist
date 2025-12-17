/**
 * ImdbService.ts
 * 
 * IMDB Website Scraper.
 * 
 * Responsibilities:
 * 1. Scrapes the official IMDB Top 250 Movies and TV pages.
 * 2. Parses the internal `__NEXT_DATA__` JSON block to extract reliable metadata.
 * 3. Provides exact data from valid IMDB sources without relying on third-party lists.
 */
import axios from 'axios';
import { ContentType } from '../store/ConfigStore';

export class ImdbService {

    // Configurable URLs in case they move, but these are legacy stable.
    private static URL_MOVIES = 'https://www.imdb.com/chart/top/';
    private static URL_SERIES = 'https://www.imdb.com/chart/toptv/';

    /**
     * Retrieves the top 250 movies from IMDB.
     * @returns A promise that resolves to an array of movie objects.
     */
    async getTop250Movies() {
        return this.fetchChart(ImdbService.URL_MOVIES, ContentType.MOVIE);
    }

    /**
     * Retrieves the top 250 series from IMDB.
     * @returns A promise that resolves to an array of series objects.
     */
    async getTop250Series() {
        return this.fetchChart(ImdbService.URL_SERIES, ContentType.SERIES);
    }

    /**
     * Fetches the chart data from the specified URL.
     * @param url The URL to fetch the chart data from.
     * @param type The type of content (MOVIE or SERIES).
     * @returns A promise that resolves to an array of movie or series objects.
     */
    private async fetchChart(url: string, type: ContentType) {
        console.log(`Scraping IMDB Chart: ${url}`);
        const res = await axios.get(url, {
            headers: {
                // Mimic browser to ensure we get the full hydrated page
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const html = res.data;
        const jsonStart = '<script id="__NEXT_DATA__" type="application/json">';
        const startIdx = html.indexOf(jsonStart);

        if (startIdx === -1) {
            throw new Error("Failed to parse IMDB page: __NEXT_DATA__ missing");
        }

        const endIdx = html.indexOf('</script>', startIdx);
        const jsonStr = html.substring(startIdx + jsonStart.length, endIdx);
        const json = JSON.parse(jsonStr);

        const edges = json?.props?.pageProps?.pageData?.chartTitles?.edges;

        if (!edges || !Array.isArray(edges)) {
            throw new Error("Failed to parse IMDB chart data structure");
        }

        return edges.map((edge: any) => {
            const node = edge.node;
            return {
                id: node.id, // tt1234567
                type: type,
                name: node.titleText?.text || 'Unknown Title',
                poster: node.primaryImage?.url || '', // High-res usually key
                description: `IMDB Rating: ${node.ratingsSummary?.aggregateRating}/10`
            };
        });
    }
}

export const imdbService = new ImdbService();
