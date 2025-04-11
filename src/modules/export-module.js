// Export Module
// Handles compilation and export of captured data

// Import the validator
import { validateExportData } from './schema-validator.js';

/**
 * Prepare data for export by validating and formatting
 * 
 * @param {Array} pageData - Array of page data objects
 * @param {Array} elementData - Array of element data objects
 * @returns {Object} - Prepared export data and validation result
 */
function prepareExportData(pageData = [], elementData = []) {
    // Create export data structure
    const exportData = {
        pages: pageData,
        elements: elementData,
        exportedAt: new Date().toISOString(),
        version: '1.0'
    };

    // Validate export data structure
    const validationResult = validateExportData(exportData);

    return {
        data: exportData,
        isValid: validationResult.success,
        validationErrors: validationResult.errors
    };
}

/**
 * Export data to a downloadable JSON file
 * 
 * @param {Array} pageData - Array of page data objects
 * @param {Array} elementData - Array of element data objects
 * @returns {Object} - Export result with success flag, errors, and blob URL
 */
function exportToJson(pageData = [], elementData = []) {
    try {
        // Prepare and validate data
        const { data, isValid, validationErrors } = prepareExportData(pageData, elementData);

        if (!isValid) {
            console.error('Validation errors:', validationErrors);
            return {
                success: false,
                errors: validationErrors,
                url: null
            };
        }

        // Format date for filename
        const dateStr = new Date().toISOString().substring(0, 10);

        // Create blob and URL
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        return {
            success: true,
            errors: [],
            url,
            filename: `dom-capture-export-${dateStr}.json`
        };
    } catch (error) {
        console.error('Export error:', error);
        return {
            success: false,
            errors: [error.message],
            url: null
        };
    }
}

/**
 * Download the exported data as a file
 * 
 * @param {Object} exportResult - Result from exportToJson function
 * @returns {boolean} - Success flag
 */
function downloadExport(exportResult) {
    if (!exportResult.success || !exportResult.url) {
        return false;
    }

    try {
        // Create and trigger download
        const a = document.createElement('a');
        a.href = exportResult.url;
        a.download = exportResult.filename;
        document.body.appendChild(a);
        a.click();

        // Clean up
        document.body.removeChild(a);
        URL.revokeObjectURL(exportResult.url);

        return true;
    } catch (error) {
        console.error('Download error:', error);
        return false;
    }
}

// Export functions
export { prepareExportData, exportToJson, downloadExport }; 