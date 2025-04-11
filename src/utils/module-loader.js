/**
 * Module Loader Utility
 * 
 * This helps load ES modules in the Chrome extension context.
 * Due to Chrome extension content security policies, we need to 
 * handle module loading carefully.
 */

/**
 * Load a module asynchronously
 * 
 * @param {string} modulePath - Path to the module
 * @returns {Promise<any>} - The loaded module
 */
export async function loadModule(modulePath) {
    try {
        // For ES modules in extension context, we need to fetch the module path
        // relative to the extension root
        const extensionUrl = chrome.runtime.getURL(modulePath);

        // Use dynamic import to load the module
        const module = await import(extensionUrl);
        return module;
    } catch (error) {
        console.error(`Error loading module from ${modulePath}:`, error);
        throw error;
    }
}

/**
 * Check if ES modules are supported
 * 
 * @returns {boolean} - Whether ES modules are supported
 */
export function supportsESModules() {
    try {
        new Function('import("")');
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Initialize all modules required for the extension
 * 
 * @returns {Promise<Object>} - Object containing all loaded modules
 */
export async function initializeModules() {
    try {
        // Check if ES modules are supported
        if (!supportsESModules()) {
            throw new Error('ES modules are not supported in this browser');
        }

        // Load modules
        const schemaValidator = await loadModule('src/modules/schema-validator.js');
        const storageManager = await loadModule('src/modules/storage-manager.js');
        const exportModule = await loadModule('src/modules/export-module.js');

        return {
            schemaValidator,
            storageManager,
            exportModule
        };
    } catch (error) {
        console.error('Error initializing modules:', error);
        throw error;
    }
} 