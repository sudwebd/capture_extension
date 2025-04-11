// Storage Management Module
// Handles data persistence, retrieval, and updates

/**
 * Save page data to local storage
 * 
 * @param {Object} pageData - Page data object to save
 * @returns {Promise<boolean>} - Success flag
 */
async function savePage(pageData) {
    try {
        // Get current page data
        const { pageData: existingPages = [] } = await chrome.storage.local.get(['pageData']);

        // Check if page with same URL pattern already exists
        const pageIndex = existingPages.findIndex(page => page.url_pattern === pageData.url_pattern);

        if (pageIndex >= 0) {
            // Update existing page
            existingPages[pageIndex] = {
                ...existingPages[pageIndex],
                ...pageData,
                updated_at: new Date().toISOString()
            };
        } else {
            // Add new page
            existingPages.push({
                ...pageData,
                updated_at: new Date().toISOString()
            });
        }

        // Save to storage
        await chrome.storage.local.set({ pageData: existingPages });
        return true;
    } catch (error) {
        console.error('Error saving page data:', error);
        return false;
    }
}

/**
 * Save element data to local storage
 * 
 * @param {Object} elementData - Element data object to save
 * @returns {Promise<boolean>} - Success flag
 */
async function saveElement(elementData) {
    try {
        // Get current element data
        const { elementData: existingElements = [] } = await chrome.storage.local.get(['elementData']);

        // Check if element with same ID already exists
        const elementIndex = existingElements.findIndex(element => element.element_id === elementData.element_id);

        if (elementIndex >= 0) {
            // Update existing element
            existingElements[elementIndex] = {
                ...existingElements[elementIndex],
                ...elementData,
                updated_at: new Date().toISOString()
            };
        } else {
            // Add new element
            existingElements.push({
                ...elementData,
                updated_at: new Date().toISOString()
            });
        }

        // Save to storage
        await chrome.storage.local.set({
            elementData: existingElements,
            lastElementId: elementData.element_id
        });

        return true;
    } catch (error) {
        console.error('Error saving element data:', error);
        return false;
    }
}

/**
 * Get all collected data
 * 
 * @returns {Promise<Object>} - Object containing pageData and elementData arrays
 */
async function getAllData() {
    try {
        const { pageData = [], elementData = [] } = await chrome.storage.local.get(['pageData', 'elementData']);
        return { pageData, elementData };
    } catch (error) {
        console.error('Error retrieving data:', error);
        return { pageData: [], elementData: [] };
    }
}

/**
 * Get the last captured element ID
 * 
 * @returns {Promise<string|null>} - Last element ID or null
 */
async function getLastElementId() {
    try {
        const { lastElementId } = await chrome.storage.local.get(['lastElementId']);
        return lastElementId || null;
    } catch (error) {
        console.error('Error retrieving last element ID:', error);
        return null;
    }
}

/**
 * Reset all stored data
 * 
 * @returns {Promise<boolean>} - Success flag
 */
async function resetAllData() {
    try {
        await chrome.storage.local.set({
            pageData: [],
            elementData: [],
            lastElementId: null
        });
        return true;
    } catch (error) {
        console.error('Error resetting data:', error);
        return false;
    }
}

/**
 * Get the capture mode state
 * 
 * @returns {Promise<boolean>} - Capture mode state
 */
async function getCaptureMode() {
    try {
        const { captureMode } = await chrome.storage.local.get(['captureMode']);
        return captureMode || false;
    } catch (error) {
        console.error('Error retrieving capture mode:', error);
        return false;
    }
}

/**
 * Set the capture mode state
 * 
 * @param {boolean} enabled - Whether capture mode should be enabled
 * @returns {Promise<boolean>} - Success flag
 */
async function setCaptureMode(enabled) {
    try {
        await chrome.storage.local.set({ captureMode: !!enabled });
        return true;
    } catch (error) {
        console.error('Error setting capture mode:', error);
        return false;
    }
}

// Export storage functions
export {
    savePage,
    saveElement,
    getAllData,
    getLastElementId,
    resetAllData,
    getCaptureMode,
    setCaptureMode
}; 