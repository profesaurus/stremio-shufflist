# Stremio Shufflist

**Stremio Shufflist** is a powerful Stremio addon that allows you to create dynamic, shuffled catalogs from multiple sources. It merges lists from **Trakt**, **MDBList**, and **Plex** into custom catalogs that you can shuffle for a fresh viewing experience every time.

![Shufflist UI](https://github.com/user-attachments/assets/placeholder)

## Features

-   **Multi-Source Integration**: Combine lists from:
    -   **Trakt**: Trending, Popular, Streaming, or Custom User Lists.
    -   **MDBList**: Any MDBList.com list.
    -   **Plex**: Your own Plex Collections.
-   **RPDB Integration**: Automatically fetch premium posters with ratings from **Rating Poster Database** (RPDB) for all your items.
-   **Dynamic Shuffling**: Tired of seeing the same movies at the start of a list? Shufflist randomizes the order on every refresh.
-   **Combined Catalogs**: Create a "Mega-List" by merging multiple sources (e.g., "IMDB Top 250" + "My Watchlist" + "Trending Sci-Fi").
-   **Web Configuration UI**: A beautiful, dark-themed, and **mobile-responsive** web dashboard to manage your lists and catalogs easily.
-   **List Filtering**: Quickly find specific source lists with real-time text filtering.
-   **Auto-Refresh**: Set a schedule to automatically update your lists in the background.

## Prerequisites

You need the following API keys depending on the services you wish to use:

### Required for Logic
-   **Node.js 18+** (if running locally)

### Service Integrations
| Variable | Description | Required? |
| :--- | :--- | :--- |
| `TRAKT_CLIENT_ID` | Your Trakt API Client ID. Create an app at [trakt.tv/oauth/applications](https://trakt.tv/oauth/applications). | Yes (for Trakt) |
| `MDBLIST_KEY` | Your MdbList API Key. Get it from [mdblist.com/preferences](https://mdblist.com/preferences). | Yes (for MDBList) |
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
  -e MDBLIST_KEY=your_mdblist_key \
  -e PLEX_URL=http://your-plex-ip:32400 \
  -e PLEX_TOKEN=your_token \
  -e PLEX_SERVER_NAME="MyServer" \
  -e PLEX_USERNAME="MyUser" \
  -e PLEX_PASSWORD="MyPassword" \
  -v /path/to/config:/app/config \
  -p 7000:7000 \
  stremio-shufflist:latest
```

### 2. Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  stremio-shufflist:
    image: stremio-shufflist:latest
    container_name: stremio-shufflist
    restart: unless-stopped
    environment:
      - TRAKT_CLIENT_ID=your_trakt_id_here
      - MDBLIST_KEY=your_mdblist_key_here
      # Plex Config (Optional)
      - PLEX_URL=http://192.168.1.50:32400
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
2.  **Repository**: `(Image URL if published, or build locally)`
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
5.  Access the Web UI at `http://localhost:7000/web-config`.

---

## Usage Guide

1.  **Open the Web Dashboard**: Navigate to `http://localhost:7000/web-config`.
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
    -   This will open Stremio and prompt you to install your custom addon.

## License

ISC
