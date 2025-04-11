/**
 * ID Registry Manager
 * Manages the ID registry separately from capture data
 * Ensures unique IDs for pages and elements across multiple capture sessions
 */

const REGISTRY_STORAGE_KEY = 'idRegistry';
const PLATFORM_KEY = 'platformKey';

/**
 * Get the current platform key
 * This is used to identify which registry to use
 * @returns {Promise<string>} - Current platform key
 */
export async function getPlatformKey() {
    const { platformKey } = await chrome.storage.local.get([PLATFORM_KEY]);
    return platformKey || 'default';
}

/**
 * Set the platform key
 * @param {string} platformKey - Platform identifier
 * @returns {Promise<boolean>} - Success flag
 */
export async function setPlatformKey(platformKey) {
    try {
        await chrome.storage.local.set({ [PLATFORM_KEY]: platformKey });
        return true;
    } catch (error) {
        console.error('Error setting platform key:', error);
        return false;
    }
}

/**
 * Get the ID registry for the current platform
 * @returns {Promise<Object>} - ID registry for the current platform
 */
export async function getIdRegistry() {
    try {
        const platformKey = await getPlatformKey();
        const { idRegistry } = await chrome.storage.local.get([REGISTRY_STORAGE_KEY]);

        if (!idRegistry || !idRegistry[platformKey]) {
            // Return a new empty registry for this platform
            return {
                pages: {},
                elements: {},
                counters: {
                    page: 1000,
                    element: 1000
                }
            };
        }

        return idRegistry[platformKey];
    } catch (error) {
        console.error('Error getting ID registry:', error);
        return {
            pages: {},
            elements: {},
            counters: {
                page: 1000,
                element: 1000
            }
        };
    }
}

/**
 * Save the ID registry for the current platform
 * @param {Object} registryData - Registry data to save
 * @returns {Promise<boolean>} - Success flag
 */
export async function saveIdRegistry(registryData) {
    try {
        const platformKey = await getPlatformKey();
        const { idRegistry = {} } = await chrome.storage.local.get([REGISTRY_STORAGE_KEY]);

        // Update the registry for this platform
        idRegistry[platformKey] = registryData;

        // Save back to storage
        await chrome.storage.local.set({ [REGISTRY_STORAGE_KEY]: idRegistry });
        return true;
    } catch (error) {
        console.error('Error saving ID registry:', error);
        return false;
    }
}

/**
 * Reset the ID registry for the current platform
 * @returns {Promise<boolean>} - Success flag
 */
export async function resetIdRegistry() {
    try {
        const platformKey = await getPlatformKey();
        const { idRegistry = {} } = await chrome.storage.local.get([REGISTRY_STORAGE_KEY]);

        // Create a new empty registry for this platform
        idRegistry[platformKey] = {
            pages: {},
            elements: {},
            counters: {
                page: 1000,
                element: 1000
            }
        };

        // Save back to storage
        await chrome.storage.local.set({ [REGISTRY_STORAGE_KEY]: idRegistry });
        return true;
    } catch (error) {
        console.error('Error resetting ID registry:', error);
        return false;
    }
}

/**
 * Export all ID registries
 * @returns {Promise<Object>} - All platform registries
 */
export async function exportAllIdRegistries() {
    try {
        const { idRegistry = {} } = await chrome.storage.local.get([REGISTRY_STORAGE_KEY]);
        return idRegistry;
    } catch (error) {
        console.error('Error exporting ID registries:', error);
        return {};
    }
}

/**
 * Import ID registries
 * @param {Object} registriesData - Registry data to import
 * @returns {Promise<boolean>} - Success flag
 */
export async function importIdRegistries(registriesData) {
    try {
        if (!registriesData || typeof registriesData !== 'object') {
            console.error('Invalid ID registries data');
            return false;
        }

        await chrome.storage.local.set({ [REGISTRY_STORAGE_KEY]: registriesData });
        return true;
    } catch (error) {
        console.error('Error importing ID registries:', error);
        return false;
    }
} 