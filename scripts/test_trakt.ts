import 'dotenv/config';
import axios from 'axios';

async function testTrakt() {
    const clientId = process.env.TRAKT_CLIENT_ID;
    console.log("Testing with Client ID length:", clientId ? clientId.length : 'MISSING');

    const client = axios.create({
        baseURL: 'https://api.trakt.tv',
        headers: {
            'Content-Type': 'application/json',
            'trakt-api-version': '2',
            'trakt-api-key': clientId,
            'User-Agent': 'Shufflist/0.0.1'
        }
    });

    try {
        console.log("Fetching Trending...");
        await client.get('/movies/trending');
        console.log("SUCCESS: Trending fetched.");
    } catch (e: any) {
        console.error("ERROR Fetching Trending:", e.response ? e.response.status : e.message);
        if (e.response && e.response.data) console.error("Data:", e.response.data);
    }

    // Try a public user list (e.g., 'masoud' - 'marvel-cinematic-universe') - known public list
    // OR just verify the user's specific request logic if we knew it.
    // Let's trying searching which is public.
    try {
        console.log("Searching for lists...");
        await client.get('/search/list?query=test');
        console.log("SUCCESS: Search fetched.");
    } catch (e: any) {
        console.error("ERROR Fetching Search:", e.response ? e.response.status : e.message);
    }
}

testTrakt();
