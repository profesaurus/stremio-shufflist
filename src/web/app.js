/**
 * app.js
 * 
 * Frontend Logic for Shufflist Configuration UI.
 * 
 * Responsibilities:
 * 1. Manages the state of lists and slots in the browser.
 * 2. Handles user interactions (forms, modals, buttons).
 * 3. Communicates with the Backend API to fetch and save configuration.
 */
// --- Constants ---

const API_BASE = '/api';
const DEFAULT_LIMIT = 25;

let state = {
    lists: [],
    slots: [],
    settings: {}, // Added for robustness
    defaultItemLimit: DEFAULT_LIMIT
};

let lastRefreshResults = {};
let currentEditingListId = null;

/**
 * Updates the 'Add List' button text based on selection count.
 */
function updateAddButtonText() {
    const btn = document.getElementById('list-modal-btn');
    if (btn.disabled) return;
    const type = document.getElementById('source-type').value;
    let count = 0;

    if (type === 'default_list') {
        count = document.querySelectorAll('input[name="default_list_select"]:checked').length;
    } else if (type === 'plex_collection') {
        count = document.querySelectorAll('input[name="plex_collection_select"]:checked').length;
    } else if (type === 'trakt_user_list') {
        const rows = document.querySelectorAll('.trakt-entry-row');
        count = Array.from(rows).filter(row => {
            const u = row.querySelector('.trakt-user-input').value.trim();
            const l = row.querySelector('.trakt-list-input').value.trim();
            return u && l; // Only count if somewhat valid, or just count rows? User wants "If multiple lists are being added". 
            // Counting rows is safer UI feedback even if empty.
            return true;
        }).length;
    } else if (type === 'mdblist_list') {
        count = document.querySelectorAll('.mdblist-entry-row').length;
    }

    // Default to 1 if count is 0 (e.g. initial state or nothing selected implies 1 potential action or just standard text)
    // But if multiple are selected, show plural.
    if (currentEditingListId) {
        btn.innerText = 'Save List';
    } else if (count > 1) {
        btn.innerText = `Add ${count} Lists`;
    } else {
        btn.innerText = 'Add List';
    }
}

function removeRow(btn) {
    btn.parentElement.remove();
    updateAddButtonText();
}

function addTraktRow() {
    const container = document.getElementById('trakt-entries-container');
    const div = document.createElement('div');
    div.className = "trakt-entry-row mb-3 bg-gray-900/30 p-2 rounded-lg border border-gray-700/30 relative group";
    div.innerHTML = `
        <input type="text" placeholder="Trakt Username"
            class="trakt-user-input w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-2 focus:ring-2 focus:ring-blue-500 outline-none" oninput="updateAddButtonText()">
        <input type="text" placeholder="List ID (e.g. top-100-movies)"
            class="trakt-list-input w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" oninput="updateAddButtonText()">
        <button type="button" onclick="removeRow(this)" class="absolute top-2 right-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    `;
    container.appendChild(div);
    updateAddButtonText();
}

function addMdbListRow() {
    const container = document.getElementById('mdblist-entries-container');
    const div = document.createElement('div');
    div.className = "mdblist-entry-row mb-3 bg-gray-900/30 p-2 rounded-lg border border-gray-700/30 relative group";
    div.innerHTML = `
        <input type="text" placeholder="MdbList Username"
            class="mdblist-user-input w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-2 focus:ring-2 focus:ring-blue-500 outline-none" oninput="updateAddButtonText()">
        <input type="text" placeholder="MdbList Name (e.g. top-100-movies)"
            class="mdblist-list-input w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" oninput="updateAddButtonText()">
        <button type="button" onclick="removeRow(this)" class="absolute top-2 right-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    `;
    container.appendChild(div);
    updateAddButtonText();
}

// --- Fetching Data ---

/**
 * Fetches initial data (lists, slots, settings) from the API.
 */
async function loadData() {
    // Load lists
    const resLists = await fetch(`${API_BASE}/lists`);
    state.lists = await resLists.json();

    // Load slots
    const resSlots = await fetch(`${API_BASE}/slots`);
    state.slots = await resSlots.json();

    // Load settings
    await loadSettings();

    // Check for Background Refresh
    try {
        const resStatus = await fetch(`${API_BASE}/status`);
        const status = await resStatus.json();

        if (state.lastRunTime !== undefined && status.lastRunTime > state.lastRunTime) {
            showToast("Background Auto-Refresh Complete!");
        }
        state.lastRunTime = status.lastRunTime;

        // Update Timer
        if (status.nextRunTime) {
            startTimer(status.nextRunTime);
        } else {
            stopTimer();
        }

    } catch (e) {
        console.error("Failed to check status", e);
    }

    renderLists();
    renderSlots();
}

/**
 * Loads application settings from the API.
 */
async function loadSettings() {
    try {
        const res = await fetch(`${API_BASE}/settings`);
        const settings = await res.json();
        state.settings = settings;
        state.defaultItemLimit = settings.defaultItemLimit || DEFAULT_LIMIT;
    } catch (e) {
        console.error("Failed to load settings", e);
        state.defaultItemLimit = DEFAULT_LIMIT;
    }
}

/**
 * Opens the settings modal.
 */
function openSettingsModal() {
    const hours = state.settings?.refreshIntervalHours || DEFAULT_REFRESH_INTERVAL_HOURS;
    const limit = state.defaultItemLimit || DEFAULT_LIMIT;
    document.getElementById('settings-interval').value = hours;
    document.getElementById('settings-limit').value = limit;
    document.getElementById('settings-modal').classList.remove('hidden');
}

/**
 * Saves current settings to the API.
 */
async function saveSettings() {
    const hoursInput = document.getElementById('settings-interval').value;
    const hours = parseInt(hoursInput, 10);

    if (isNaN(hours) || hours < 0) {
        showToast("Invalid hours. Please enter a positive number.", 'error');
        return;
    }

    const limitInput = document.getElementById('settings-limit').value;
    const limit = parseInt(limitInput, 10);

    if (isNaN(limit) || limit < 1 || limit > 1000) {
        showToast("Invalid limit. Must be between 1 and 1000.", 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshIntervalHours: hours, defaultItemLimit: limit })
        });
        const data = await res.json();
        if (data.success) {
            state.settings = data.settings;
            showToast("Settings saved successfully.");
            closeModal('settings-modal');
        } else {
            showToast(data.error || "Failed to save settings", 'error');
        }
    } catch (e) {
        showToast("Error saving settings.", 'error');
    }
}

// --- Rendering ---

/**
 * Generates consistent colors for a group name.
 */
function getGroupColors(groupName) {
    if (!groupName) return { bg: 'bg-gray-700', text: 'text-gray-300', border: 'border-gray-600' };

    const colors = [
        { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
        { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
        { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30' },
        { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/30' },
        { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/30' },
        { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/30' },
        { bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-500/30' },
        { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30' },
        { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30' },
        { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/30' },
    ];

    let hash = 0;
    for (let i = 0; i < groupName.length; i++) {
        hash = groupName.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

/**
 * Renders the entire UI (slots and lists).
 */
function render() {
    renderSlots();
    renderLists();
}





/**
 * Renders the catalog slots container.
 */
function renderSlots() {
    const container = document.getElementById('slots-container');
    container.innerHTML = state.slots.map(slot => {
        const type = slot.type || 'movie';
        const isMovie = type === 'movie';
        const borderColor = isMovie ? 'border-blue-500/30' : 'border-yellow-500/30';
        const hoverColor = isMovie ? 'hover:border-blue-500' : 'hover:border-yellow-500';
        const typeColor = isMovie ? 'text-blue-400 bg-blue-500/10' : 'text-yellow-400 bg-yellow-500/10';
        const typeLabel = isMovie ? 'MOVIE' : 'SERIES';

        // Generate Badge HTML from persisted state
        let badgeHtml = '';
        if (lastRefreshResults[slot.id]) {
            const res = lastRefreshResults[slot.id];
            if (res.type === 'error') {
                badgeHtml = `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 inline-block" title="${res.title}">ERROR</span>`;
            } else if (res.type === 'switched') {
                badgeHtml = `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 inline-block" title="${res.title}">FALLBACK</span>`;
            } else if (res.type === 'empty') {
                badgeHtml = `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 inline-block" title="${res.title}">EMPTY</span>`;
            }
        }

        return `
        <div class="bg-gray-800 rounded-2xl p-4 border ${borderColor} ${hoverColor} transition-all shadow-md">
            <div class="flex justify-between items-start mb-1">
                <div>
                    <div class="flex items-center gap-3 mb-1">
                        <h2 class="text-xl font-bold text-white">${slot.alias}</h2>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded ${typeColor}">${typeLabel}</span>
                    </div>
                    <p class="text-xs text-gray-500 uppercase tracking-wide">${slot.listIds.length} Lists Active</p>
                    <div class="mt-1 h-5">${badgeHtml}</div>
                </div>
                <div class="flex gap-2">
                    <button id="refresh-btn-${slot.id}" onclick="refreshSlot('${slot.id}')" class="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-blue-400" title="Force Refresh">
                        ↻
                    </button>
                    <button onclick="openConfigSlotModal('${slot.id}')" class="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-purple-400" title="Configure">
                        ⚙️
                    </button>
                    <button onclick="deleteSlot('${slot.id}')" class="p-2 bg-gray-700 hover:bg-red-900/50 rounded-lg text-red-500" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>

            <div class="bg-gray-900/50 rounded-xl p-3 border border-gray-700/50">
                <div class="text-xs uppercase tracking-wide text-gray-500 mb-2">Current Selection</div>
                ${slot.currentSelection ? `
                    <div class="flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full ${isMovie ? 'bg-blue-500' : 'bg-yellow-500'}"></div>
                        <span class="font-medium ${isMovie ? 'text-blue-400' : 'text-yellow-400'} break-words">${slot.currentSelection.name}</span>
                        <span class="text-xs text-gray-500 ml-auto whitespace-nowrap">${slot.currentSelection.items.length - 1} items</span>
                    </div>
                ` : '<div class="text-gray-500 italic text-sm">No list selected yet</div>'}
            </div>
            
        </div>
    `}).join('');
}

/**
 * Renders the list containers (movies and series).
 */
function renderLists() {
    const movieContainer = document.getElementById('movie-lists-container');
    const seriesContainer = document.getElementById('series-lists-container');
    movieContainer.innerHTML = '';
    seriesContainer.innerHTML = '';

    const movieFilter = document.getElementById('movie-list-filter')?.value.toLowerCase() || '';
    const seriesFilter = document.getElementById('series-list-filter')?.value.toLowerCase() || '';

    state.lists.forEach(list => {
        const isMovie = (list.contentType || 'movie') === 'movie';

        // Filter Check
        const filter = isMovie ? movieFilter : seriesFilter;
        if (filter && !list.alias.toLowerCase().includes(filter) && !list.group?.toLowerCase().includes(filter)) {
            return;
        }

        const colors = getGroupColors(list.group);
        const titleColor = isMovie ? 'text-blue-400' : 'text-yellow-400';

        const html = `
        <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 flex justify-between items-center group hover:border-blue-500/30 transition-all">
            <div class="min-w-0">
                <div class="font-semibold ${titleColor} break-words">${list.alias}</div>
                <div class="flex items-center gap-2 mt-0.5">
                    <div class="text-xs text-gray-500">${formatSourceType(list.type)}</div>
                    ${list.group ? `<div class="text-[10px] font-bold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border} tracking-tight" title="Group: ${list.group}">${list.group}</div>` : ''}
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="openEditListModal('${list.id}')" class="p-2 text-gray-500 hover:text-blue-400 transition-colors" title="Edit">
                    ⚙️
                </button>
                <button onclick="deleteList('${list.id}')" class="p-2 text-gray-500 hover:text-red-400 transition-colors" title="Delete">
                    ✕
                </button>
            </div>
        </div>
        `;

        if ((list.contentType || 'movie') === 'series') {
            seriesContainer.insertAdjacentHTML('beforeend', html);
        } else {
            movieContainer.insertAdjacentHTML('beforeend', html);
        }
    });

    if (state.lists.filter(l => (l.contentType || 'movie') === 'movie').length === 0) {
        movieContainer.innerHTML = '<div class="text-gray-500 text-sm italic">No movie lists</div>';
    }
    if (state.lists.filter(l => l.contentType === 'series').length === 0) {
        seriesContainer.innerHTML = '<div class="text-gray-500 text-sm italic">No series lists</div>';
    }
}

// formatMode removed

/**
 * Formats the source type for display.
 * @param {string} type - The source type key.
 * @returns {string} The formatted label.
 */
function formatSourceType(type) {
    if (type === 'trakt_trending') return 'Trakt Trending';
    if (type === 'trakt_user_list') return 'Trakt User List';
    if (type === 'mdblist_list') return 'MDBList';
    if (type === 'plex_collection') return 'Plex Collection';
    if (type === 'default_list') return 'Default List';
    return type;
}

// --- Actions: Lists ---

// Load Plex Collections
/**
 * Loads Plex collections from the API and populates the dropdown.
 * @param {string|null} selectedId - The ID of the currently selected collection (optional).
 */
async function loadPlexCollections(selectedId = null) {
    const contentType = document.querySelector('input[name="list-content-type"]:checked').value;
    const select = document.getElementById('plexCollectionId');
    const multiContainer = document.getElementById('plexCollectionMulti');

    // Reset UI
    select.innerHTML = '<option value="">Loading...</option>';
    select.disabled = true;
    multiContainer.innerHTML = '<div class="text-gray-400 text-sm italic">Loading collections...</div>';

    console.log(`Loading Plex Collections for type: ${contentType}`);
    try {
        const res = await fetch(`${API_BASE}/plex/collections?type=${contentType}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();

        select.innerHTML = '<option value="">Select a collection...</option>';
        multiContainer.innerHTML = '';

        if (data.length === 0) {
            multiContainer.innerHTML = '<div class="text-gray-500 text-sm italic">No collections found.</div>';
        }

        data.forEach(col => {
            // Populate Dropdown (Edit Mode)
            const opt = document.createElement('option');
            opt.value = col.key;
            opt.textContent = `${col.title}`;
            if (selectedId && col.key === selectedId) {
                opt.selected = true;
            }
            select.appendChild(opt);

            // Populate Multi-Select (Add Mode)
            const label = document.createElement('label');
            label.className = "flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer group transition-colors";
            label.innerHTML = `
                <div class="relative flex items-center">
                    <input type="checkbox" name="plex_collection_select" value="${col.key}" data-label="${col.title}" onchange="updateAddButtonText()"
                        class="peer appearance-none w-5 h-5 border-2 border-gray-500 rounded bg-transparent checked:bg-purple-500 checked:border-purple-500 transition-all cursor-pointer">
                    <svg class="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity" 
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <span class="text-gray-300 group-hover:text-white transition-colors">${col.title}</span>
            `;
            multiContainer.appendChild(label);
        });

    } catch (e) {
        console.error("Failed to load Plex collections", e);
        select.innerHTML = '<option value="">Error loading collections</option>';
        multiContainer.innerHTML = '<div class="text-red-400 text-sm">Error loading collections</div>';
    } finally {
        select.disabled = false;
        updateAddButtonText(); // Update after load
    }
}

/**
 * Populates the multi-select container for Default Lists from the dropdown options.
 */
function populateDefaultMulti() {
    const select = document.getElementById('default-type');
    const multiContainer = document.getElementById('default-type-multi');
    multiContainer.innerHTML = '';

    Array.from(select.options).forEach(opt => {
        if (!opt.value) return; // Skip placeholder

        const label = document.createElement('label');
        label.className = "flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer group transition-colors";
        label.innerHTML = `
                <div class="relative flex items-center">
                    <input type="checkbox" name="default_list_select" value="${opt.value}" data-label="${opt.text}" onchange="updateAddButtonText()"
                        class="peer appearance-none w-5 h-5 border-2 border-gray-500 rounded bg-transparent checked:bg-purple-500 checked:border-purple-500 transition-all cursor-pointer">
                    <svg class="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity" 
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <span class="text-gray-300 group-hover:text-white transition-colors">${opt.text}</span>
            `;
        multiContainer.appendChild(label);
    });
}

document.querySelectorAll('input[name="list-content-type"]').forEach(radio => {
    radio.addEventListener('change', () => {
        if (document.getElementById('source-type').value === 'plex_collection') {
            loadPlexCollections();
        }
        // Also update text if switching to default list and re-rendering checkboxes?
        // Actually populateDefaultMulti is static from index.html options, but toggleSourceFields refreshes visibility.
    });
});

document.getElementById('source-type').addEventListener('change', () => {
    toggleSourceFields();
    if (document.getElementById('source-type').value === 'plex_collection') {
        loadPlexCollections();
    }
});

// Auto-fill list alias from Trakt Default List selection
document.getElementById('default-type').addEventListener('change', function () {
    const aliasInput = document.getElementById('list-alias');
    if (!aliasInput.value.trim() && this.value) { // Check that a valid value is selected
        const text = this.options[this.selectedIndex].text;
        aliasInput.value = text;
    }
});

// Auto-fill list alias from Plex Collection selection
document.getElementById('plexCollectionId').addEventListener('change', function () {
    const aliasInput = document.getElementById('list-alias');
    if (!aliasInput.value.trim()) {
        // Use textContent because options are created dynamically
        const text = this.options[this.selectedIndex].textContent;
        if (text && text !== "Select a collection..." && text !== "Loading...") {
            aliasInput.value = text;
        }
    }
});



/**
 * Saves a new or updated list configuration.
 */
async function saveList() {
    const btn = document.getElementById('list-modal-btn');

    // UI Loading State
    btn.disabled = true;
    btn.classList.add('animate-pulse');
    const originalText = btn.innerText;
    btn.innerText = currentEditingListId ? "Updating..." : "Adding...";

    try {
        let alias = document.getElementById('list-alias').value;
        const type = document.getElementById('source-type').value;
        const contentType = document.querySelector('input[name="list-content-type"]:checked').value;
        const group = document.getElementById('list-group').value.trim();
        const shuffle = document.getElementById('list-shuffle').checked;
        const limitInput = document.getElementById('list-limit').value;
        const limit = limitInput ? parseInt(limitInput, 10) : (state.defaultItemLimit || DEFAULT_LIMIT);

        // BATCH CREATION LOGIC (Add Mode Only)
        if (!currentEditingListId && ['default_list', 'plex_collection', 'trakt_user_list', 'mdblist_list'].includes(type)) {
            let items = [];

            if (type === 'default_list') {
                const checked = document.querySelectorAll('input[name="default_list_select"]:checked');
                checked.forEach(chk => {
                    items.push({
                        config: { listType: chk.value, listTypeLabel: chk.dataset.label },
                        alias: chk.dataset.label
                    });
                });
            } else if (type === 'plex_collection') {
                const checked = document.querySelectorAll('input[name="plex_collection_select"]:checked');
                checked.forEach(chk => {
                    items.push({
                        config: { collectionId: chk.value, collectionName: chk.dataset.label },
                        alias: chk.dataset.label
                    });
                });
            } else if (type === 'trakt_user_list') {
                const rows = document.querySelectorAll('.trakt-entry-row');
                rows.forEach(row => {
                    const username = row.querySelector('.trakt-user-input').value.trim();
                    const listId = row.querySelector('.trakt-list-input').value.trim();
                    if (username && listId) {
                        items.push({
                            config: { username, listId },
                            alias: `${username}'s ${listId} List`
                        });
                    }
                });
            } else if (type === 'mdblist_list') {
                const rows = document.querySelectorAll('.mdblist-entry-row');
                rows.forEach(row => {
                    const username = row.querySelector('.mdblist-user-input').value.trim();
                    const listName = row.querySelector('.mdblist-list-input').value.trim();
                    if (username && listName) {
                        items.push({
                            config: { username, listName },
                            alias: listName
                        });
                    }
                });
            }

            if (items.length === 0) {
                showToast("Please select at least one list.", 'error');
                return;
            }

            let successCount = 0;
            for (const item of items) {
                const res = await fetch(`${API_BASE}/lists`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        alias: alias || item.alias, // Use override alias if provided (unlikely for batch but possible)
                        type,
                        contentType,
                        config: item.config,
                        shuffle,
                        limit,
                        group
                    })
                });
                if (res.ok) successCount++;
            }

            if (successCount === items.length) {
                showToast(`Created ${successCount} lists successfully.`);
            } else {
                showToast(`Created ${successCount}/${items.length} lists. Check logs for errors.`, 'warning');
            }

            closeModal('add-list-modal');
            loadData();
            return;
        }

        // ORIGINAL SINGLE ITEM LOGIC (Edit Mode or Single-Source Types)
        let config = {};
        if (type === 'trakt_user_list') {
            config = {
                username: document.getElementById('trakt-username').value,
                listId: document.getElementById('trakt-list-id').value
            };
            if (!alias) alias = `${config.username}'s ${config.listId} List`;
        } else if (type === 'default_list') {
            // Edit Mode Fallback
            const select = document.getElementById('default-type');
            if (!select.value) {
                showToast("Please select a list type.", 'error');
                return;
            }
            config = {
                listType: select.value,
                listTypeLabel: select.options[select.selectedIndex].text
            };
            if (!alias) alias = config.listTypeLabel;
        } else if (type === 'mdblist_list') {
            config = {
                username: document.getElementById('mdblist-username').value,
                listName: document.getElementById('mdblist-list-name').value
            };
            if (!alias) alias = config.listName || "MDBList";
        } else if (type === 'plex_collection') {
            // Edit Mode Fallback
            const colSelect = document.getElementById('plexCollectionId');
            if (!colSelect.value) {
                showToast("Please select a Plex collection.", 'error');
                return;
            }
            config = {
                collectionId: colSelect.value,
                collectionName: colSelect.options[colSelect.selectedIndex].textContent
            };
            if (!alias) alias = config.collectionName;
        }

        if (currentEditingListId) {
            // Update
            const res = await fetch(`${API_BASE}/lists/${currentEditingListId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alias, type, contentType, config, shuffle, limit, group })
            });
            if (!res.ok) {
                const data = await res.json();
                showToast(data.error || "Failed to update list", 'error');
                return;
            }
        } else {
            // Create (Single)
            const res = await fetch(`${API_BASE}/lists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alias, type, contentType, config, shuffle, limit, group })
            });
            if (!res.ok) {
                const data = await res.json();
                showToast(data.error || "Failed to create list. Is it valid?", 'error');
                return;
            }
        }

        closeModal('add-list-modal');
        loadData();
    } catch (e) {
        console.error(e);
        showToast("An unexpected error occurred while saving.", 'error');
    } finally {
        // Reset UI State
        btn.disabled = false;
        btn.classList.remove('animate-pulse');
        updateAddButtonText(); // Restore appropriate text
    }
}

/**
 * Displays a toast notification.
 * @param {string} message - The message to display.
 * @param {string} type - The type of toast ('success', 'warning', 'error').
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-message');
    const inner = toast.firstElementChild;

    msg.innerText = message;

    // Reset Classes
    inner.classList.remove(
        'bg-green-500/90', 'border-green-400/50',
        'bg-yellow-500/90', 'border-yellow-400/50',
        'bg-red-500/90', 'border-red-400/50'
    );

    if (type === 'error') {
        inner.classList.add('bg-red-500/90', 'border-red-400/50');
    } else if (type === 'warning') {
        inner.classList.add('bg-yellow-500/90', 'border-yellow-400/50');
    } else {
        inner.classList.add('bg-green-500/90', 'border-green-400/50');
    }

    toast.classList.remove('opacity-0', 'translate-y-[-20px]');
    toast.classList.add('opacity-100', 'translate-y-0');

    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-[-20px]');
    }, 3000);
}

/**
 * Deletes a list by ID.
 * @param {string} id - The list ID.
 */
async function deleteList(id) {
    if (!confirm("Delete this list?")) return;
    await fetch(`${API_BASE}/lists/${id}`, { method: 'DELETE' });
    loadData();
}

// --- Actions: Slots ---

/**
 * Creates a new catalog slot.
 */
async function createSlot() {
    const alias = document.getElementById('new-slot-alias').value;
    const type = document.querySelector('input[name="new-slot-type"]:checked').value;
    if (!alias) return;

    const btn = document.getElementById('create-slot-btn');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Creating...";
    btn.classList.add('animate-pulse');

    try {
        await fetch(`${API_BASE}/slots`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alias, type })
        });
        closeModal('add-slot-modal');
        loadData();
        showToast("Catalog added. Please reinstall addon in Stremio to see changes.", 'warning');
    } catch (e) {
        showToast("Failed to create catalog", 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
        btn.classList.remove('animate-pulse');
    }
}

/**
 * Deletes a catalog slot by ID.
 * @param {string} id - The slot ID.
 */
async function deleteSlot(id) {
    if (!confirm("Delete this catalog?")) return;
    await fetch(`${API_BASE}/slots/${id}`, { method: 'DELETE' });
    loadData();
    showToast("Catalog deleted. Please reinstall addon in Stremio to see changes.", 'warning');
}

/**
 * Refreshes a specific catalog slot.
 * @param {string} id - The slot ID.
 */
async function refreshSlot(id) {
    const btn = document.getElementById(`refresh-btn-${id}`);
    if (btn) {
        btn.classList.add('animate-pulse', 'text-blue-200');
        btn.disabled = true;
    }

    try {
        const res = await fetch(`${API_BASE}/slots/${id}/refresh`, { method: 'POST' });
        const data = await res.json();

        // Clear prev status
        delete lastRefreshResults[id];

        if (!data.success) {
            lastRefreshResults[id] = { type: 'error', title: data.error || "Unknown Error" };
            showToast(data.error || "Failed to refresh catalog", 'error');
        } else if (data.retried) {
            lastRefreshResults[id] = { type: 'switched', title: `Switched from ${data.failedListName}: ${data.failReason}` };
            showToast(`List '${data.failedListName}' ${data.failReason}. Fallback to: ${data.listName}`, 'warning');
        } else if (data.isEmpty) {
            lastRefreshResults[id] = { type: 'empty', title: `${data.listName} is empty` };
            showToast(`Warning: Selected list '${data.listName}' is empty.`, 'warning');
        }
    } catch (e) {
        showToast("Network error refreshing slot", 'error');
    } finally {
        if (btn) {
            btn.classList.remove('animate-pulse', 'text-blue-200');
            btn.disabled = false;
        }
        loadData();
    }
}

/**
 * Refreshes all catalog slots.
 */
async function refreshAllCatalogs() {
    if (!confirm("Refresh ALL catalogs? This might take a moment.")) return;

    const btn = document.getElementById('refresh-all-btn');
    const originalText = btn ? btn.innerHTML : '';

    if (btn) {
        btn.classList.add('animate-pulse');
        btn.innerText = "↻ Refreshing...";
        btn.disabled = true;
    }

    try {
        const res = await fetch(`${API_BASE}/slots/refresh-all`, { method: 'POST' });
        const data = await res.json();

        // Reset all status
        lastRefreshResults = {};

        // Analyze results
        const results = data.results || [];
        let errors = 0;
        let switches = 0;
        let empties = 0;

        results.forEach(r => {
            if (!r.success) {
                errors++;
                lastRefreshResults[r.slotId] = { type: 'error', title: r.error };
            } else if (r.retried) {
                switches++;
                lastRefreshResults[r.slotId] = { type: 'switched', title: `Switched from ${r.failedListName}: ${r.failReason}` };
            } else if (r.isEmpty) {
                empties++;
                lastRefreshResults[r.slotId] = { type: 'empty', title: `${r.listName} is empty` };
            }
        });

        if (errors > 0 || switches > 0 || empties > 0) {
            let parts = [];
            if (errors > 0) parts.push(`${errors} errors`);
            if (switches > 0) parts.push(`${switches} switches`);
            if (empties > 0) parts.push(`${empties} empty`);
            showToast(`Refresh Complete. ${parts.join(', ')}. Check catalog tags.`, 'warning');
        } else {
            showToast("All catalogs refreshed successfully.");
        }
    } catch (e) {
        showToast("Network error refreshing catalogs", 'error');
    } finally {
        if (btn) {
            btn.classList.remove('animate-pulse');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        loadData();
    }
}

// --- Slot Configuration ---

let currentConfigSlotId = null;

/**
 * Opens the configuration modal for a specific slot.
 * @param {string} id - The slot ID.
 */
function openConfigSlotModal(id) {
    currentConfigSlotId = id;
    const slot = state.slots.find(s => s.id === id);
    if (!slot) return;

    document.getElementById('config-slot-id').value = id;
    document.getElementById('config-slot-alias').value = slot.alias;

    // Set type
    const radios = document.getElementsByName('config-slot-type');
    for (const r of radios) {
        if (r.value === (slot.type || 'movie')) r.checked = true;
    }

    document.getElementById('config-slot-modal').classList.remove('hidden');
    document.getElementById('slot-list-filter').value = ''; // Reset filter
    renderSlotConfigLists(slot.listIds, slot.type || 'movie');
}

/**
 * Refreshes the list filter in the slot config modal when type changes.
 */
function refreshConfigListFilter() {
    const type = document.querySelector('input[name="config-slot-type"]:checked').value;
    const slot = state.slots.find(s => s.id === currentConfigSlotId);
    renderSlotConfigLists(slot.listIds, type);
}

/**
 * Renders the list checkboxes for slot configuration.
 * @param {string[]} selectedIds - Array of selected list IDs.
 * @param {string} slotType - The type of slot ('movie' or 'series').
 */
function renderSlotConfigLists(selectedIds = [], slotType = 'movie') {
    const checkboxContainer = document.getElementById('slot-list-checkboxes');

    if (document.getElementById('slot-list-filter')) {
        document.getElementById('slot-list-filter').value = '';
    }

    // Filter lists by slotType
    const validLists = state.lists.filter(l => (l.contentType || 'movie') === slotType);

    checkboxContainer.innerHTML = validLists.map(list => {
        const checked = selectedIds.includes(list.id) ? 'checked' : '';
        const colors = getGroupColors(list.group);
        return `
            <label class="flex items-center gap-3 p-2 hover:bg-gray-800 rounded cursor-pointer">
                <input type="checkbox" name="slot_list_select" value="${list.id}" ${checked} class="accent-purple-500 w-4 h-4">
                    <div class="flex flex-col min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="text-sm text-gray-300 font-medium break-words">${list.alias}</span>
                            ${list.group ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border} tracking-tight" title="Group: ${list.group}">${list.group}</span>` : ''}
                        </div>
                    </div>
                    <span class="text-xs text-gray-500 ml-auto whitespace-nowrap">${formatSourceType(list.type)}</span>
                </label>
        `;
    }).join('');

    if (validLists.length === 0) {
        checkboxContainer.innerHTML = `< div class="text-sm text-red-400 p-2" > No ${slotType} lists available.</div > `;
    }
}

/**
 * Selects all visible lists in the slot config modal.
 */
function selectAllLists() {
    document.querySelectorAll('input[name="slot_list_select"]').forEach(el => el.checked = true);
}

/**
 * Deselects all lists in the slot config modal.
 */
function selectNoneLists() {
    document.querySelectorAll('input[name="slot_list_select"]').forEach(el => el.checked = false);
}

/**
 * Filters the displayed lists in the slot config modal based on search input.
 */
function filterSlotLists() {
    const input = document.getElementById('slot-list-filter');
    const term = input.value.toLowerCase();
    const rows = document.querySelectorAll('#slot-list-checkboxes label');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        if (text.includes(term)) {
            row.classList.remove('hidden');
            row.classList.add('flex'); // restoration
        } else {
            row.classList.add('hidden');
            row.classList.remove('flex');
        }
    });
}

/**
 * Saves the configuration for a catalog slot.
 */
async function saveSlotConfig() {
    const id = currentConfigSlotId;
    const alias = document.getElementById('config-slot-alias').value;
    const type = document.querySelector('input[name="config-slot-type"]:checked').value;
    const inputs = document.querySelectorAll('input[name="slot_list_select"]:checked');
    const listIds = Array.from(inputs).map(i => i.value);

    // Warn if empty?
    if (listIds.length === 0) {
        if (!confirm("No lists selected. This catalog will not return any items. Continue?")) return;
    }

    const res = await fetch(`${API_BASE}/slots/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listIds, alias, type })
    });

    // Check if type changed implicitly by comparing with current state before fetch
    const oldSlot = state.slots.find(s => s.id === id);
    if (oldSlot) {
        if ((oldSlot.type || 'movie') !== type) {
            showToast("Catalog type changed. Please reinstall addon in Stremio to update the catalog title type.", 'warning');
        } else if (oldSlot.alias !== alias) {
            showToast("Catalog name changed. Please reinstall addon in Stremio to see changes.", 'warning');
        }
    }

    const data = await res.json();

    // Clear prev status
    delete lastRefreshResults[id];

    if (data.refreshResult) {
        const rr = data.refreshResult;

        if (!rr.success) {
            lastRefreshResults[id] = { type: 'error', title: rr.error };
            showToast(rr.error || "Failed to auto-refresh catalog", 'error');
        } else if (rr.retried) {
            lastRefreshResults[id] = { type: 'switched', title: `Switched from ${rr.failedListName}: ${rr.failReason} ` };
            showToast(`Current list '${rr.failedListName}' ${rr.failReason}. Fallback to: ${rr.listName} `, 'warning');
        } else if (rr.isEmpty) {
            lastRefreshResults[id] = { type: 'empty', title: `${rr.listName} is empty` };
            showToast(`Warning: Selected list '${rr.listName}' is empty.`, 'warning');
        }
    }

    closeModal('config-slot-modal');
    loadData();
}

// --- UI Helpers ---

/**
 * Toggles the Add List dropdown menu.
 */
function toggleAddMenu() {
    document.getElementById('add-list-menu').classList.toggle('hidden');
}

/**
 * Initializes the Add List modal with a specific source type.
 * @param {string} sourceType - The source type to pre-select.
 */
function initAddList(sourceType) {
    document.getElementById('add-list-menu').classList.add('hidden'); // Close menu
    openAddListModal(); // Open modal (resets fields)

    const select = document.getElementById('source-type');
    select.value = sourceType;

    toggleSourceFields();
    if (sourceType === 'plex_collection') {
        loadPlexCollections();
    }
}

// Close dropdown when clicking outside
window.onclick = function (event) {
    if (!event.target.matches('button[onclick="toggleAddMenu()"]') && !event.target.closest('button[onclick="toggleAddMenu()"]')) {
        const dropdowns = document.getElementsByClassName("dropdown-content"); // NOTE: I am not using this class in HTML, I should target ID directly or use a better selector.
        const menu = document.getElementById('add-list-menu');
        if (menu && !menu.classList.contains('hidden')) {
            menu.classList.add('hidden');
        }
    }
}

/**
 * Opens the modal to add a new list.
 * @param {string} forcedType - The default content type ('movie' or 'series').
 */
function openAddListModal(forcedType = 'movie') {
    currentEditingListId = null;
    document.getElementById('list-modal-title').innerText = 'Add New Lists';
    document.getElementById('list-modal-btn').innerText = 'Add List';

    // Clear fields
    document.getElementById('list-alias').value = '';
    document.getElementById('list-alias-container').classList.add('hidden'); // Hide for new lists
    document.getElementById('list-group').value = '';
    document.getElementById('source-type').value = 'default_list';
    document.getElementById('default-type').value = '';
    document.getElementById('trakt-username').value = '';
    document.getElementById('trakt-list-id').value = '';
    document.getElementById('mdblist-username').value = '';
    document.getElementById('mdblist-list-name').value = '';
    document.getElementById('list-shuffle').checked = false;
    const limitInput = document.getElementById('list-limit');
    const defaultLimit = state.defaultItemLimit || DEFAULT_LIMIT;
    limitInput.value = defaultLimit;
    limitInput.placeholder = defaultLimit;


    // Set type
    const radios = document.getElementsByName('list-content-type');
    for (const r of radios) { if (r.value === forcedType) r.checked = true; }

    toggleSourceFields();
    document.getElementById('add-list-modal').classList.remove('hidden');
}

/**
 * Opens the modal to edit an existing list.
 * @param {string} id - The list ID.
 */
function openEditListModal(id) {
    const list = state.lists.find(l => l.id === id);
    if (!list) return;

    currentEditingListId = id;
    document.getElementById('list-modal-title').innerText = 'Edit Source List';
    document.getElementById('list-modal-btn').innerText = 'Update List';

    const aliasInput = document.getElementById('list-alias');
    aliasInput.value = list.alias;
    document.getElementById('list-alias-container').classList.remove('hidden'); // Show for edit
    document.getElementById('list-group').value = list.group || '';
    document.getElementById('source-type').value = list.type;
    document.getElementById('list-shuffle').checked = list.shuffle || false;

    const limitInput = document.getElementById('list-limit');
    const defaultLimit = state.defaultItemLimit || DEFAULT_LIMIT;
    limitInput.value = list.limit || defaultLimit;
    limitInput.placeholder = defaultLimit;

    // Set type
    const radios = document.getElementsByName('list-content-type');
    for (const r of radios) { if (r.value === (list.contentType || 'movie')) r.checked = true; }

    // Populate config fields based on type
    if (list.type === 'trakt_user_list') {
        document.getElementById('trakt-username').value = list.config.username || '';
        document.getElementById('trakt-list-id').value = list.config.listId || '';
    } else if (list.type === 'default_list') {
        document.getElementById('default-type').value = list.config.listType || 'trending';
    } else if (list.type === 'mdblist_list') {
        document.getElementById('mdblist-username').value = list.config.username || '';
        document.getElementById('mdblist-list-name').value = list.config.listName || list.config.listId || '';
    }

    toggleSourceFields();

    if (list.type === 'plex_collection') {
        loadPlexCollections(list.config.collectionId);
    }

    document.getElementById('add-list-modal').classList.remove('hidden');
}

/**
 * Opens the modal to add a new catalog slot.
 */
function openAddSlotModal() {
    const nextNum = state.slots.length + 1;
    const input = document.getElementById('new-slot-alias');
    input.value = `Shufflist ${nextNum} `;
    document.getElementById('add-slot-modal').classList.remove('hidden');
    setTimeout(() => input.select(), 100); // Select all text for easy overwrite
}

/**
 * Closes a modal by ID.
 * @param {string} id - The modal ID.
 */
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

/**
 * Toggles visibility of source-specific fields in the list modal.
 */
/**
 * Toggles visibility of source-specific fields in the list modal.
 */
function toggleSourceFields() {
    const type = document.getElementById('source-type').value;
    const isAddMode = !currentEditingListId;

    document.querySelectorAll('.source-field').forEach(el => el.classList.add('hidden'));

    if (type === 'trakt_user_list') {
        document.getElementById('field-trakt-user').classList.remove('hidden');

        // Always reset to single row when switching context or mode
        const container = document.getElementById('trakt-entries-container');
        while (container.children.length > 1) {
            container.removeChild(container.lastChild);
        }

        if (isAddMode) {
            document.getElementById('btn-add-trakt-row').classList.remove('hidden');
        } else {
            document.getElementById('btn-add-trakt-row').classList.add('hidden');
        }
    }

    if (type === 'default_list') {
        const container = document.getElementById('field-default');
        container.classList.remove('hidden');

        // Toggle Multi/Single select based on mode
        if (isAddMode) {
            document.getElementById('default-type').classList.add('hidden');
            document.getElementById('default-type-multi').classList.remove('hidden');
            populateDefaultMulti(); // Ensure it's populated
        } else {
            document.getElementById('default-type').classList.remove('hidden');
            document.getElementById('default-type-multi').classList.add('hidden');
        }
    }

    if (type === 'mdblist_list') {
        document.getElementById('field-mdblist').classList.remove('hidden');

        // Always reset to single row
        const container = document.getElementById('mdblist-entries-container');
        while (container.children.length > 1) {
            container.removeChild(container.lastChild);
        }

        if (isAddMode) {
            document.getElementById('btn-add-mdblist-row').classList.remove('hidden');
        } else {
            document.getElementById('btn-add-mdblist-row').classList.add('hidden');
        }
    }

    if (type === 'plex_collection') {
        console.log("Plex Collection selected in UI");
        document.getElementById('plexFields').classList.remove('hidden');

        // Toggle Multi/Single select based on mode
        if (isAddMode) {
            document.getElementById('plexCollectionId').classList.add('hidden');
            document.getElementById('plexCollectionMulti').classList.remove('hidden');
        } else {
            document.getElementById('plexCollectionId').classList.remove('hidden');
            document.getElementById('plexCollectionMulti').classList.add('hidden');
        }
    }

    updateAddButtonText();
}

// --- Install Helpers ---

/**
 * Opens the install modal.
 */
function openInstallModal() {
    document.getElementById('install-modal').classList.remove('hidden');
}

/**
 * Gets the base URL.
 * @returns The base URL.
 */
function getBaseURL() {
    return window.location.protocol + '//' + window.location.host;
}

/**
 * Gets the manifest URL.
 * @returns The manifest URL.
 */
function getManifestUrl() {
    return getBaseURL() + '/manifest.json';
}

/**
 * Installs the addon in Stremio.
 */
function installStremio() {
    window.open(
        `stremio://${window.location.host}/manifest.json`
    )
}

/**
 * Installs the addon in Stremio Web.
 */
function installStremioWeb() {
    const manifestUrl = getManifestUrl();
    const webUrl = `https://web.stremio.com/#/addons?addon=${encodeURIComponent(manifestUrl)}`;
    window.open(webUrl, '_blank');
}

/**
 * Copies the manifest URL to the clipboard.
 */
function copyManifestUrl() {
    const url = getManifestUrl();
    navigator.clipboard.writeText(url).then(() => {
        alert("Manifest URL copied to clipboard!");
    });
}

// --- Timer Logic ---

let timerInterval = null;

/**
 * Starts the timer.
 * @param targetTime The target time to refresh.
 */
function startTimer(targetTime) {
    if (timerInterval) clearInterval(timerInterval);

    const container = document.getElementById('refresh-timer-container');
    const display = document.getElementById('refresh-timer');

    if (container) container.classList.remove('hidden');

    function update() {
        const now = Date.now();
        const diff = targetTime - now;

        if (diff <= 0) {
            if (display) display.innerText = "Refreshing...";
            // Poll strictly soon
            loadData();
            return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (display) display.innerText = `${hours}h ${minutes}m ${seconds}s`;
    }

    update();
    timerInterval = setInterval(update, 1000);
}

/**
 * Stops the timer.
 */
function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    const container = document.getElementById('refresh-timer-container');
    if (container) container.classList.add('hidden');
}

// --- Init ---

/**
 * Loads the data.
 */
loadData();

/**
 * Polls for updates every 5 seconds.
 */
setInterval(() => {
    // Only poll if no modals are open to avoid disrupting user interaction
    const openModals = document.querySelectorAll('div[id$="-modal"]:not(.hidden)');
    if (openModals.length === 0) {
        loadData();
    }
}, 5000);

/**
 * Sets up smart scrollbar behavior (fade in on scroll).
 */
function setupSmartScrollbars() {
    const containers = document.querySelectorAll('.custom-scrollbar');
    containers.forEach(container => {
        let timeout;
        container.addEventListener('scroll', () => {
            container.classList.add('scrolling');
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                container.classList.remove('scrolling');
            }, 1000);
        });
    });
}

// Initialize scrollbars
setupSmartScrollbars();
