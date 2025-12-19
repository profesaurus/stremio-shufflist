# Stremio Shufflist 🔀

### Design your perfect content rotation.

**Stremio Shufflist** is a powerful add-on that breathes life into your Stremio library. Instead of static lists, Shufflist lets you create Dynamic Catalogs that automatically rotate through your favorite content sources (lists). Whether you want a "Movie of the Night" catalog that picks a random genre every day, or a "Sitcom Shuffle" that rotates through your Plex TV sitcom collections, Shufflist handles it all.

### Addon Configuration WebUI:
<img width="1287" height="805" alt="image" src="https://github.com/user-attachments/assets/646a6912-83e4-47c7-a510-76309386b8c3" />

### Stremio Catalogs:
<img width="1477" height="1104" alt="image" src="https://github.com/user-attachments/assets/a7eaaafd-5d9f-4f25-aed2-3ddef3414d30" />

## ✨ Features

-   **🧩 Dynamic Catalogs**: Define catalogs in Stremio that act as placeholders. These placeholder catalogs automatically update to display different content based on your configuration.
-   **🔄 Smart Rotation**: Catalogs automatically rotate through a pool of lists you define (e.g., switch between "Trending Sci-Fi" and "80s Action" every 24 hours).
-   **📋 List Shuffling**: Enable "Shuffle" on specific lists to randomize the item order every time they appear. Perfect for "Random Episode" style viewing.
-   **🖥️ Web Management UI**: Detailed, **mobile-responsive** web interface to add list sources, configure catalogs, **filter lists**, and manage your library.
-   **⭐ RPDB Integration**: Automatically fetch premium posters with ratings from **Rating Poster Database** (RPDB) for all your items.
-   **⚡ Seamless Updates**: Most content updates happen instantly. New lists appear in your existing catalogs without needing to reinstall the addon in Stremio.
    > Note: You will need to reinstall the addon if you add/remove a catalog or change a catalog's name or media type. This is a Stremio limitation.
-   **📅 Automated Scheduling**: Content refreshes automatically in the background based on your preferred interval (in hours).
-   **🚫 Group Exclusivity**: Assign lists to a 'Group' (e.g. 'Action', 'Comedy'). Shufflist ensures that only *one* list from a group is active at a time across all your catalogs, preventing duplicate genres or themes.

## 🌐 Supported Sources

Mix and match content from your favorite platforms:

-   **Trakt**: Trending, Popular, Watched, Collected, Recommendations, and custom User Lists.
-   **MDBList**: Import any list from MDBList.
-   **IMDB**: Built-in support for Official Top 250 Movies & TV Shows.
-   **Plex**: Connect your Plex server to use your Plex Collections as source lists.


## Prerequisites

You need the following API keys depending on the services you wish to use:

### Required for Logic
-   **Node.js 18+** (if running locally)

### Service Integrations
| Variable | Description | Required? |
| :--- | :--- | :--- |
| `TRAKT_CLIENT_ID` | Your Trakt API Client ID. Create an app at [trakt.tv/oauth/applications](https://trakt.tv/oauth/applications). | Yes (for Trakt) |
| `MDBLIST_KEY` | Your MDBList API Key. Get it from [MDBList.com/preferences](https://MDBList.com/preferences). | Yes (for MDBList) |
| `RPDB_KEY` | Your RPDB API Key. Get it from [ratingposterdb.com](https://ratingposterdb.com). | Yes (for Posters) |
| `PLEX_URL` | Your Plex Server URL (e.g., `http://192.168.1.10:32400`). | Yes (for Plex) |
| `PLEX_TOKEN` | Your Plex Authentication Token. [Guide to find X-Plex-Token](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/). | Yes (for Plex) |
| `PLEX_SERVER_NAME` | The friendly name of your Plex server. | Yes (for Plex) |
| `PLEX_USERNAME` | Your Plex Username (used for internal auth). | Yes (for Plex) |
| `PLEX_PASSWORD` | Your Plex Password (used for internal auth). | Yes (for Plex) |

### Optional
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | The port the server listens on. | `7000` |

---

## Installation

### 1. Docker (Recommended)

Run the container directly:

```bash
docker run -d \
  --name=stremio-shufflist \
  -e TRAKT_CLIENT_ID=your_trakt_id \
  -e MDBLIST_KEY=your_MDBList_key \
  -e RPDB_KEY=your_rpdb_key \
  -e PLEX_URL=http://your-plex-ip:32400 \
  -e PLEX_TOKEN=your_token \
  -e PLEX_SERVER_NAME="YourServerName" \
  -e PLEX_USERNAME="YourUsername" \
  -e PLEX_PASSWORD="YourPassword" \
  -v /path/to/config:/app/config \
  -p 7000:7000 \
  profesaurus/stremio-shufflist:latest
```

### 2. Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  stremio-shufflist:
    image: profesaurus/stremio-shufflist:latest
    container_name: stremio-shufflist
    restart: unless-stopped
    environment:
      - TRAKT_CLIENT_ID=your_trakt_id_here
      - MDBLIST_KEY=your_MDBList_key_here
      - RPDB_KEY=your_rpdb_key
      - PLEX_URL=http://your-plex-ip:32400
      - PLEX_TOKEN=your_plex_token
      - PLEX_SERVER_NAME=Tower
      - PLEX_USERNAME=myplexuser
      - PLEX_PASSWORD=secret
    volumes:
      - ./config:/app/config
    ports:
      - "7000:7000"
```

Run with:
```bash
docker-compose up -d
```

### 3. Unraid

To install on Unraid, use the "Add Container" feature in the Docker tab.

1.  **Name**: Stremio Shufflist
2.  **Repository**: `(profesaurus/stremio-shufflist, or build locally)`
3.  **Network Type**: Bridge
4.  **WebUI**: `http://[IP]:[PORT:7000]/web-config`
5.  **Port Mapping**:
    -   Container Port: `7000`
    -   Host Port: `7000`
6.  **Path Mapping**:
    -   Container Path: `/app/config`
    -   Host Path: `/mnt/user/appdata/stremio-shufflist`
7.  **Variables**: Add variables for `TRAKT_CLIENT_ID`, `MDBLIST_KEY`, etc. as "Variables".

### 4. Local Development

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the root directory with your keys (see `Prerequisites`).
4.  Build and Start:
    ```bash
    npm run build
    npm start
    ```
5.  Access the Web UI at `http://localhost:7000/web-config` or `https://your-domain-name/web-config` if using a reverse proxy setup.

---

## Usage Guide

1.  **Open the Web Dashboard**: Navigate to `http://localhost:7000/web-config` or `https://your-domain-name/web-config` if using a reverse proxy setup.
2.  **Add Lists**:
    -   Click **"Add Lists"** in the top right.
    -   Select a source (e.g., Trakt User List, Default Trakt List, or Plex Collection).
    -   Configure the list options (filters, limits).
3.  **Create a Catalog**:
    -   Click **"+ New Catalog"** in the left sidebar.
    -   Give it a name (e.g., "weekend Binge").
    -   Click the **Gear Icon (⚙️)** on the new catalog slot.
    -   Select which of your added lists should feed into this catalog.
4.  **Install in Stremio**:
    -   Click the **"Install"** button in the header.
    -   Click **"Stremio"** to install directly to Stremio on your device.
    -   Click **"Stremio Web"** to install to Stremio Web.
    -   Click **"Copy URL**" to install in the addon section of Stremio using the url.
      > Note: Your addon instance must be accessible to the internet if you want to use the addon in Stremio outside your local network.

## License

MIT
