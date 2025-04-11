// Schema Validator Module
// Ensures captured element and page data conform to required JSON schemas

// Page-level schema
const pageSchema = {
    type: 'object',
    required: [
        'page_id',
        'url_pattern',
        'framework',
        'ui_version',
        'description',
        'updated_at'
    ],
    properties: {
        page_id: { type: 'string' },
        url_pattern: { type: 'string' },
        framework: { type: 'string' },
        ui_version: { type: 'string' },
        description: { type: 'string' },
        KPI: { type: ['string', 'null'] },
        updated_at: { type: 'string', format: 'date-time' },
        from: {
            type: ['array', 'null'],
            items: {
                type: 'object',
                required: ['node', 'action'],
                properties: {
                    node: { type: 'string' },
                    action: { type: 'string' }
                }
            }
        }
    }
};

// Element-level schema
const elementSchema = {
    type: 'object',
    required: [
        'element_id',
        'page_id',
        'type',
        'dom_selector',
        'description',
        'version',
        'updated_at',
        'status'
    ],
    properties: {
        element_id: { type: 'string' },
        page_id: { type: 'string' },
        type: { type: 'string' },
        dom_selector: { type: 'string' },
        description: { type: 'string' },
        version: { type: 'string' },
        KPI: { type: ['string', 'null'] },
        updated_at: { type: 'string', format: 'date-time' },
        status: {
            type: 'string',
            enum: ['active', 'inactive', 'deprecated']
        },
        from: {
            type: ['array', 'null'],
            items: {
                type: 'object',
                required: ['node', 'action'],
                properties: {
                    node: { type: 'string' },
                    action: { type: 'string' }
                }
            }
        }
    }
};

/**
 * Simple validation function to check if an object adheres to a schema
 * 
 * Note: This is a lightweight approach. In a production environment, 
 * you would typically use a full schema validation library like AJV.
 * 
 * @param {Object} data - The data object to validate
 * @param {Object} schema - The schema to validate against
 * @returns {Object} - Validation result with success flag and errors array
 */
function validateObject(data, schema) {
    const errors = [];

    // Check required fields
    if (schema.required) {
        for (const field of schema.required) {
            if (data[field] === undefined) {
                errors.push(`Missing required field: ${field}`);
            }
        }
    }

    // Check properties
    if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (data[key] !== undefined) {
                // Type checking
                if (Array.isArray(propSchema.type)) {
                    const validType = propSchema.type.some(type => {
                        if (type === 'null' && data[key] === null) return true;
                        return type === typeof data[key];
                    });

                    if (!validType) {
                        errors.push(`Field ${key} has invalid type. Expected one of ${propSchema.type.join(', ')}`);
                    }
                } else if (propSchema.type === 'array' && !Array.isArray(data[key])) {
                    errors.push(`Field ${key} must be an array`);
                } else if (propSchema.type !== 'array' && propSchema.type !== typeof data[key] && !(propSchema.type === 'null' && data[key] === null)) {
                    errors.push(`Field ${key} has invalid type. Expected ${propSchema.type}`);
                }

                // Format checking for date-time
                if (propSchema.format === 'date-time' && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(data[key])) {
                    errors.push(`Field ${key} must be a valid ISO date-time string`);
                }

                // Enum checking
                if (propSchema.enum && !propSchema.enum.includes(data[key])) {
                    errors.push(`Field ${key} must be one of: ${propSchema.enum.join(', ')}`);
                }

                // Array item validation
                if (propSchema.type === 'array' && Array.isArray(data[key]) && propSchema.items) {
                    for (let i = 0; i < data[key].length; i++) {
                        const itemValidation = validateObject(data[key][i], propSchema.items);
                        if (!itemValidation.success) {
                            errors.push(`Invalid item at index ${i} in ${key}: ${itemValidation.errors.join(', ')}`);
                        }
                    }
                }
            }
        }
    }

    return {
        success: errors.length === 0,
        errors
    };
}

/**
 * Validate a page data object against the page schema
 * @param {Object} pageData - The page data to validate
 * @returns {Object} - Validation result
 */
function validatePageData(pageData) {
    return validateObject(pageData, pageSchema);
}

/**
 * Validate an element data object against the element schema
 * @param {Object} elementData - The element data to validate
 * @returns {Object} - Validation result
 */
function validateElementData(elementData) {
    return validateObject(elementData, elementSchema);
}

/**
 * Validate an entire export dataset containing pages and elements
 * @param {Object} exportData - The export data with pages and elements arrays
 * @returns {Object} - Validation result
 */
function validateExportData(exportData) {
    const errors = [];

    if (!exportData.pages || !Array.isArray(exportData.pages)) {
        errors.push('Export data must contain a pages array');
    } else {
        for (let i = 0; i < exportData.pages.length; i++) {
            const pageValidation = validatePageData(exportData.pages[i]);
            if (!pageValidation.success) {
                errors.push(`Invalid page at index ${i}: ${pageValidation.errors.join(', ')}`);
            }
        }
    }

    if (!exportData.elements || !Array.isArray(exportData.elements)) {
        errors.push('Export data must contain an elements array');
    } else {
        for (let i = 0; i < exportData.elements.length; i++) {
            const elementValidation = validateElementData(exportData.elements[i]);
            if (!elementValidation.success) {
                errors.push(`Invalid element at index ${i}: ${elementValidation.errors.join(', ')}`);
            }
        }
    }

    return {
        success: errors.length === 0,
        errors
    };
}

// Export validation functions
export { validatePageData, validateElementData, validateExportData }; 