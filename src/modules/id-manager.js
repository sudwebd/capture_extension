/**
 * ID Manager Module
 * Ensures unique IDs for pages and elements across multiple capture sessions
 */

// Import the ID Registry Manager
import * as idRegistryManager from './id-registry-manager.js';

// Constants for ID prefixes
const PAGE_PREFIX = 'page_';
const ELEMENT_PREFIX = 'elem_';

/**
 * Initialize the ID Manager
 * @returns {Promise<void>}
 */
export async function initializeIdManager() {
    // Get the current registry for this platform
    const registry = await idRegistryManager.getIdRegistry();
    console.log('ID registry loaded successfully');
}

/**
 * Generate a unique ID for a page
 * @param {string} urlPattern - URL pattern of the page
 * @param {string} title - Page title
 * @returns {Promise<string>} Unique page ID
 */
export async function generateUniquePageId(urlPattern, title) {
    // Get the registry for this platform
    const idRegistry = await idRegistryManager.getIdRegistry();

    if (!idRegistry) {
        console.error('ID registry not initialized');
        // Fallback to a simple ID if registry doesn't exist
        return `${PAGE_PREFIX}${urlPattern.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}`;
    }

    // Generate a fingerprint for this page
    const pageFingerprint = `${urlPattern}`;

    // Check if the fingerprint exists in the registry
    if (idRegistry.pages[pageFingerprint]) {
        return idRegistry.pages[pageFingerprint];
    }

    // Generate a new unique ID
    const counter = idRegistry.counters.page++;
    const segments = urlPattern.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || 'home';

    // Create a clean segment name (remove special chars, limit length)
    const cleanSegment = lastSegment.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 20);

    // Combine with counter for uniqueness
    const uniqueId = `${PAGE_PREFIX}${cleanSegment}_${counter}`;

    // Store in registry
    idRegistry.pages[pageFingerprint] = uniqueId;
    await idRegistryManager.saveIdRegistry(idRegistry);

    return uniqueId;
}

/**
 * Generate a unique ID for an element
 * @param {Element} element - DOM element
 * @param {string} pageId - ID of the page containing the element
 * @returns {Promise<string>} Unique element ID
 */
export async function generateUniqueElementId(element, pageId) {
    // Get the registry for this platform
    const idRegistry = await idRegistryManager.getIdRegistry();

    if (!idRegistry) {
        console.error('ID registry not initialized');
        // Fallback to a simple ID if registry doesn't exist
        return `${ELEMENT_PREFIX}${getElementType(element)}_${Date.now()}`;
    }

    // Generate a robust selector for this element
    const selector = generateRobustSelector(element);

    // Generate context for this element
    const elementFingerprint = `${pageId}|${selector}`;

    // Check if we've seen this element before in the same context
    if (idRegistry.elements[elementFingerprint]) {
        return idRegistry.elements[elementFingerprint];
    }

    // Generate a new unique ID
    const counter = idRegistry.counters.element++;
    const type = getElementType(element);
    const id = element.id || '';
    const className = Array.from(element.classList).join('_') || '';
    const text = element.textContent?.trim().substring(0, 15).replace(/\s+/g, '_') || '';

    // Combine with counter for uniqueness
    const uniqueId = `${ELEMENT_PREFIX}${type}_${id || className || text || 'unknown'}_${counter}`.toLowerCase();

    // Store in registry
    idRegistry.elements[elementFingerprint] = uniqueId;
    await idRegistryManager.saveIdRegistry(idRegistry);

    return uniqueId;
}

/**
 * Generate a robust CSS selector for an element
 * @param {Element} element - DOM element
 * @returns {string} Robust CSS selector
 */
export function generateRobustSelector(element) {
    // If the element has an ID, use it as the most specific selector
    if (element.id) {
        return `#${element.id}`;
    }

    // Try data-* attributes that are often more stable than classes
    const dataAttributes = Array.from(element.attributes)
        .filter(attr => attr.name.startsWith('data-') &&
            !attr.name.includes('react') &&
            !attr.name.includes('vue') &&
            !attr.name.includes('ng-'))
        .map(attr => `[${attr.name}="${attr.value}"]`);

    if (dataAttributes.length > 0) {
        return `${element.tagName.toLowerCase()}${dataAttributes.join('')}`;
    }

    // If the element has classes, use them (but filter out dynamic ones)
    if (element.className) {
        const stableClasses = Array.from(element.classList)
            .filter(cls => !cls.includes('active') &&
                !cls.includes('selected') &&
                !cls.includes('open') &&
                !cls.includes('hover') &&
                !cls.includes('dynamic') &&
                !cls.match(/^([a-f0-9]{4,}|ng-|react-|vue-)/) && // Skip likely generated classes
                cls.length > 2) // Skip tiny class names that are likely to be generic
            .map(cls => `.${cls}`);

        if (stableClasses.length > 0) {
            return `${element.tagName.toLowerCase()}${stableClasses.join('')}`;
        }
    }

    // Build a path-based selector with context (up to 3 ancestors)
    const path = [];
    let currentElement = element;
    let depth = 0;

    while (currentElement && depth < 3) {
        let selector = currentElement.tagName.toLowerCase();

        // Add attributes that might help identification
        if (currentElement.getAttribute('aria-label')) {
            selector += `[aria-label="${currentElement.getAttribute('aria-label')}"]`;
        } else if (currentElement.getAttribute('name')) {
            selector += `[name="${currentElement.getAttribute('name')}"]`;
        } else if (currentElement.hasAttribute('type')) {
            selector += `[type="${currentElement.getAttribute('type')}"]`;
        }

        // Add position
        if (currentElement.parentElement) {
            const siblings = Array.from(currentElement.parentElement.children)
                .filter(child => child.tagName === currentElement.tagName);

            if (siblings.length > 1) {
                const index = siblings.indexOf(currentElement) + 1;
                selector += `:nth-of-type(${index})`;
            }
        }

        path.unshift(selector);
        currentElement = currentElement.parentElement;
        depth++;
    }

    return path.join(' > ');
}

/**
 * Helper function to get element type
 * @param {Element} element - DOM element
 * @returns {string} Element type
 */
function getElementType(element) {
    if (element.tagName === 'BUTTON' ||
        (element.tagName === 'INPUT' && element.type === 'button') ||
        element.role === 'button') {
        return 'button';
    } else if (element.tagName === 'A') {
        return 'link';
    } else if (element.tagName === 'INPUT') {
        return element.type || 'input';
    } else if (element.tagName === 'SELECT') {
        return 'select';
    } else {
        return element.tagName.toLowerCase();
    }
}

/**
 * Export the ID registry 
 * @returns {Promise<Object>} ID registry data
 */
export async function exportIdRegistry() {
    return await idRegistryManager.exportAllIdRegistries();
}

/**
 * Import an ID registry
 * @param {Object} idRegistryData - ID registry data to import
 * @returns {Promise<boolean>} Success status
 */
export async function importIdRegistry(idRegistryData) {
    return await idRegistryManager.importIdRegistries(idRegistryData);
}
