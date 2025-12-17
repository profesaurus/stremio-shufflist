# Stremio Shufflist 🔀

**Design your perfect content rotation.**

Stremio Shufflist is a powerful add-on that breathes life into your Stremio library. Instead of static lists, Shufflist lets you create **Dynamic Catalogs** that automatically rotate through your favorite content sources. Whether you want a "Movie of the Night" catalog that picks a random genre every day, or a "Sitcom Shuffle" that rotates through your Plex collections, Shufflist handles it all.

## ✨ Features

- **🧩 Dynamic Catalogs**: Define catalogs in Stremio that act as placeholders. These placeholder catalogs automatically update to display different content based on your configuration.
- **🔄 Smart Rotation**: Catalogs automatically rotate through a pool of lists you define (e.g., switch between "Trending Sci-Fi" and "80s Action" every 24 hours).
- **yx List Shuffling**: Enable "Shuffle" on specific lists to randomize the item order every time they appear. Perfect for "Random Episode" style viewing.
- **🖥️ Web Management UI**: Detailed web interface to add list sources, configure catalogs, and manage your library.
- **⚡ Seamless Updates**: Most content updates happen instantly. New lists appear in your existing catalogs without needing to reinstall the addon in Stremio.
    - *Note: You will need to reinstall the addon if you add/remove a catalog or change a catalog's name or media type.*
- **📅 Automated Scheduling**: Content refreshes automatically in the background based on your preferred interval (in hours).

## 📋 Supported Sources

Mix and match content from your favorite platforms:

- **Trakt**: Trending, Popular, Watched, Collected, Recommendations, and custom User Lists.
- **MdbList**: Import any list from MdbList.
- **IMDB**: Built-in support for Official Top 250 Movies & TV Shows.
- **Plex**: Connect your Plex server to use your Plex Collections as source lists.

## 🚀 Getting Started

### Docker (Recommended)

The easiest way to run Shufflist is via Docker.

1. **Create a `docker-compose.yml`**:
   ```yaml
   services:
     shufflist:
       image: shufflist:latest # Or build locally
       container_name: shufflist
       restart: unless-stopped
       ports:
         - "7000:7000"
       volumes:
         - ./config:/app/config
       environment:
         - PORT=7000
         - MDBLIST_KEY=your_key_here
         - TRAKT_CLIENT_ID=your_id_here
         - PLEX_URL=your_url_here
         - PLEX_USERNAME=your_username_here
         - PLEX_PASSWORD=your_password_here
         - PLEX_SERVER_NAME=your_server_name_here
         - PLEX_TOKEN=your_token_here
   ```

2. **Run the container**:
   ```bash
   docker-compose up -d
   ```

3. **Configure**:
   Open a browser and navigate to the URL of where you're hosting the addon to set up your lists and catalogs. Default port: 7000

### Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Build**:
   ```bash
   npm run build
   ```

3. **Start**:
   ```bash
   npm start
   ```

## ⚙️ Configuration

1. **Add Sources**: Use the "Add List" button to import content from Trakt, IMDB, or Plex.
2. **Create Catalogs**: Create a "Catalog" (e.g., "Daily Discovery").
3. **Assign Lists**: Edit the catalog and check which lists should be available for that catalog to randomly select from.
4. **Install**: Click "Install in Stremio" to add your new dynamic catalogs to your Stremio app.

## 📝 License

ISC
