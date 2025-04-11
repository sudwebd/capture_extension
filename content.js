// DOM Capture Module for DOM Capture Extension

// Import ID manager 
let idManager;
let generateUniquePageId;
let generateUniqueElementId;
let generateRobustSelector;

// State variables
let captureMode = false;
let lastCapturedElementId = null;
let highlightedElement = null;
let capturePopup = null;
let pendingNavigation = null;
let navigationOverlay = null;

// Initialize content script
init();

// Main initialization function
async function init() {
    try {
        // Dynamically import ID manager module
        idManager = await import(chrome.runtime.getURL("src/modules/id-manager.js"));
        generateUniquePageId = idManager.generateUniquePageId;
        generateUniqueElementId = idManager.generateUniqueElementId;
        generateRobustSelector = idManager.generateRobustSelector;

        // Initialize ID manager
        await idManager.initializeIdManager();

        // Load state from storage
        const { captureMode: storedCaptureMode, lastElementId } = await chrome.storage.local.get([
            'captureMode',
            'lastElementId'
        ]);

        captureMode = storedCaptureMode || false;
        lastCapturedElementId = lastElementId || null;

        // Initialize page data capture
        capturePage();

        // Setup message listener for popup communication
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'enableCapture') {
                enableCaptureMode();
            } else if (message.action === 'disableCapture') {
                disableCaptureMode();
            } else if (message.action === 'checkPendingNavigation') {
                // This is called by background script after page load to check if we need to re-enable capture
                if (message.resumeCapture) {
                    setTimeout(() => enableCaptureMode(), 500); // Short delay to ensure DOM is ready
                }
            }
            sendResponse({ success: true });
            return true;
        });
    } catch (error) {
        console.error("Error initializing DOM Capture module:", error);
    }
}

// Enable capture mode
function enableCaptureMode() {
    captureMode = true;
    document.body.style.cursor = 'crosshair';

    // Add click listener for element selection
    document.addEventListener('click', handleElementClick, true);

    // Add mouseover listener for element highlighting
    document.addEventListener('mouseover', handleElementHover, true);
    document.addEventListener('mouseout', handleElementOut, true);

    // Show notification
    showNotification('DOM Capture Mode Enabled. Click on elements to capture.');

    // Update storage
    chrome.storage.local.set({ captureMode: true });

    // Notify background script that capture mode is enabled
    chrome.runtime.sendMessage({
        action: 'captureModeChanged',
        isEnabled: true
    });
}

// Disable capture mode
function disableCaptureMode(temporary = false) {
    captureMode = false;
    document.body.style.cursor = '';

    // Remove event listeners
    document.removeEventListener('click', handleElementClick, true);
    document.removeEventListener('mouseover', handleElementHover, true);
    document.removeEventListener('mouseout', handleElementOut, true);

    // Remove any highlights
    if (highlightedElement) {
        highlightedElement.style.outline = '';
        highlightedElement = null;
    }

    // Remove popup if it exists
    removePopup();

    // Show notification
    showNotification(temporary ?
        'DOM Capture Mode temporarily disabled for navigation. Click on the element to navigate.' :
        'DOM Capture Mode Disabled.');

    // Only update storage if not temporarily disabled
    if (!temporary) {
        chrome.storage.local.set({ captureMode: false });
        chrome.runtime.sendMessage({
            action: 'captureModeChanged',
            isEnabled: false
        });
    } else {
        // If temporarily disabled, notify background script
        chrome.runtime.sendMessage({
            action: 'temporaryDisableForNavigation',
            lastElementId: lastCapturedElementId
        });
    }
}

// Handle element hover (highlight)
function handleElementHover(e) {
    if (!captureMode) return;

    // Don't highlight popup elements
    if (isInPopup(e.target)) return;

    // Remove previous highlight
    if (highlightedElement) {
        highlightedElement.style.outline = '';
    }

    // Add new highlight
    highlightedElement = e.target;
    highlightedElement.style.outline = '2px solid #2196F3';

    // Prevent default behavior
    e.stopPropagation();
    e.preventDefault();
}

// Handle element hover out
function handleElementOut(e) {
    if (!captureMode || !highlightedElement) return;
    if (isInPopup(e.target)) return;

    highlightedElement.style.outline = '';
    highlightedElement = null;
}

// Handle element click (capture)
function handleElementClick(e) {
    if (!captureMode) return;

    // Don't capture clicks on popup elements
    if (isInPopup(e.target)) return;

    // Prevent default behavior and propagation
    e.stopPropagation();
    e.preventDefault();

    // Create the confirmation popup
    createCapturePopup(e.target);
}

// Create popup for element capture confirmation
function createCapturePopup(element) {
    // Remove any existing popup
    removePopup();

    // Create popup container
    capturePopup = document.createElement('div');
    capturePopup.className = 'dom-capture-popup';
    capturePopup.style.position = 'fixed';
    capturePopup.style.top = '50%';
    capturePopup.style.left = '50%';
    capturePopup.style.transform = 'translate(-50%, -50%)';
    capturePopup.style.backgroundColor = 'white';
    capturePopup.style.padding = '15px';
    capturePopup.style.borderRadius = '5px';
    capturePopup.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
    capturePopup.style.zIndex = '10000';
    capturePopup.style.minWidth = '300px';

    // Create popup content
    capturePopup.innerHTML = `
    <h3 style="margin-top: 0; font-size: 16px;">Capture DOM Element</h3>
    <p style="font-size: 14px;">Would you like to capture this element?</p>
    <p style="font-size: 12px; background: #f0f0f0; padding: 5px; overflow: auto; max-height: 80px;">
      ${escapeHtml(element.outerHTML.substring(0, 150))}${element.outerHTML.length > 150 ? '...' : ''}
    </p>
    
    <div style="margin-bottom: 10px;">
      <label style="display: block; margin-bottom: 5px; font-size: 14px;">
        Description (required):
        <input id="element-description" style="width: 100%; padding: 5px; margin-top: 5px;" 
               placeholder="Enter element description">
      </label>
    </div>
    
    <div style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 5px; font-size: 14px;">
        KPI (optional):
        <input id="element-kpi" style="width: 100%; padding: 5px; margin-top: 5px;" 
               placeholder="Enter KPI if applicable">
      </label>
    </div>
    
    <div style="margin-bottom: 15px;">
      <label style="display: flex; align-items: center; font-size: 14px; cursor: pointer;">
        <input type="checkbox" id="navigation-trigger" style="margin-right: 8px;">
        Mark as navigation trigger (will allow navigation after capture)
      </label>
      <p style="font-size: 12px; color: #666; margin: 5px 0 0 24px;">
        Temporarily disables capture mode so you can click the element to navigate
      </p>
    </div>
    
    <div style="display: flex; justify-content: space-between;">
      <button id="capture-cancel" style="padding: 8px 12px; background: #ccc; border: none; border-radius: 4px; cursor: pointer;">
        Cancel
      </button>
      <button id="capture-confirm" style="padding: 8px 12px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Capture
      </button>
    </div>
  `;

    // Add to body
    document.body.appendChild(capturePopup);

    // Focus description field
    document.getElementById('element-description').focus();

    // Add event listeners
    document.getElementById('capture-cancel').addEventListener('click', removePopup);
    document.getElementById('capture-confirm').addEventListener('click', () => {
        const description = document.getElementById('element-description').value.trim();
        const kpi = document.getElementById('element-kpi').value.trim();
        const isNavigationTrigger = document.getElementById('navigation-trigger').checked;

        if (!description) {
            alert('Description is required');
            return;
        }

        // Store the element for potential navigation after capture
        if (isNavigationTrigger) {
            pendingNavigation = {
                element: element,
                isNavigationTrigger: true
            };
        }

        captureElement(element, description, kpi || null)
            .then(() => {
                removePopup();

                // If navigation trigger, temporarily disable capture mode and prepare for navigation
                if (isNavigationTrigger && pendingNavigation) {
                    processNavigationTrigger(pendingNavigation.element);
                }
            });
    });
}

// Process navigation trigger after capture
function processNavigationTrigger(element) {
    // Temporarily disable capture mode
    disableCaptureMode(true);

    // Create a visual overlay to show the element is ready for navigation
    createNavigationOverlay(element);
}

// Create a visual overlay to indicate an element is ready for navigation
function createNavigationOverlay(element) {
    // Remove any existing overlay
    removeNavigationOverlay();

    // Highlight the element with a special style
    element.style.outline = '3px dashed #ff9800';
    element.style.outlineOffset = '2px';

    // Create an overlay to indicate navigation readiness
    navigationOverlay = document.createElement('div');
    navigationOverlay.className = 'navigation-overlay';
    navigationOverlay.style.position = 'fixed';
    navigationOverlay.style.bottom = '20px';
    navigationOverlay.style.left = '50%';
    navigationOverlay.style.transform = 'translateX(-50%)';
    navigationOverlay.style.backgroundColor = '#ff9800';
    navigationOverlay.style.color = 'white';
    navigationOverlay.style.padding = '10px 15px';
    navigationOverlay.style.borderRadius = '5px';
    navigationOverlay.style.zIndex = '10000';
    navigationOverlay.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    navigationOverlay.style.textAlign = 'center';
    navigationOverlay.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">Navigation Ready</div>
        <div style="font-size: 12px;">Click the highlighted element to navigate</div>
    `;

    document.body.appendChild(navigationOverlay);
}

// Remove navigation overlay
function removeNavigationOverlay() {
    if (navigationOverlay && navigationOverlay.parentNode) {
        navigationOverlay.parentNode.removeChild(navigationOverlay);
        navigationOverlay = null;
    }

    // Reset any element highlighting
    const elements = document.querySelectorAll('*');
    for (const el of elements) {
        if (el.style.outline.includes('dashed #ff9800')) {
            el.style.outline = '';
            el.style.outlineOffset = '';
        }
    }
}

// Remove the popup
function removePopup() {
    if (capturePopup && capturePopup.parentNode) {
        capturePopup.parentNode.removeChild(capturePopup);
        capturePopup = null;
    }
}

// Capture element data
async function captureElement(element, description, kpi) {
    try {
        // Get the current page data
        const { pageData = [] } = await chrome.storage.local.get(['pageData']);
        const currentPage = pageData.find(page => page.url_pattern === getUrlPattern(window.location.href));

        if (!currentPage) {
            console.error('No page data found for current URL');
            return;
        }

        // Generate a unique ID for this element using the ID manager
        const elementId = await generateUniqueElementId(element, currentPage.page_id);

        // Create element data structure
        const elementData = {
            element_id: elementId,
            page_id: currentPage.page_id,
            type: getElementType(element),
            dom_selector: generateRobustSelector(element),
            description: description,
            version: "1.0",
            KPI: kpi,
            updated_at: new Date().toISOString(),
            status: "active",
            from: lastCapturedElementId ? [
                { node: lastCapturedElementId, action: "click" }
            ] : null
        };

        // Get existing element data
        const { elementData: storedElementData = [] } = await chrome.storage.local.get(['elementData']);

        // Update storage
        await chrome.storage.local.set({
            elementData: [...storedElementData, elementData],
            lastElementId: elementId
        });

        // Update local state
        lastCapturedElementId = elementId;

        // Show notification
        showNotification('Element captured successfully');

    } catch (error) {
        console.error('Error capturing element:', error);
        showNotification('Error capturing element: ' + error.message, 'error');
    }
}

// Capture page data
async function capturePage() {
    try {
        const currentUrl = window.location.href;
        const urlPattern = getUrlPattern(currentUrl);

        // Get existing page data
        const { pageData = [] } = await chrome.storage.local.get(['pageData']);

        // Check if this page is already captured
        if (pageData.some(page => page.url_pattern === urlPattern)) {
            return; // Already captured this page
        }

        // Detect framework (simple detection)
        const framework = detectFramework();

        // Generate page ID using ID manager
        const pageId = await generateUniquePageId(urlPattern, document.title);

        // Create page data structure
        const pageInfo = {
            page_id: pageId,
            url_pattern: urlPattern,
            framework: framework,
            ui_version: "1.0",
            description: document.title || "Untitled Page",
            KPI: null,
            updated_at: new Date().toISOString(),
            from: null
        };

        // Update storage
        await chrome.storage.local.set({
            pageData: [...pageData, pageInfo]
        });

        console.log('Page data captured:', pageInfo);

    } catch (error) {
        console.error('Error capturing page:', error);
    }
}

// Helper function to detect framework
function detectFramework() {
    if (window.React || document.querySelector('[data-reactroot]')) {
        return 'React';
    } else if (window.angular || document.querySelector('[ng-app]')) {
        return 'Angular';
    } else if (document.querySelector('[data-v-]')) {
        return 'Vue';
    } else {
        return 'Unknown';
    }
}

// Helper function to get element type
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

// Helper function to get URL pattern for matching
function getUrlPattern(url) {
    try {
        const parsedUrl = new URL(url);
        // Remove query parameters and hashes
        return parsedUrl.pathname;
    } catch (e) {
        return url;
    }
}

// Helper function to show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '10px';
    notification.style.right = '10px';
    notification.style.padding = '10px 15px';
    notification.style.borderRadius = '4px';
    notification.style.color = 'white';
    notification.style.zIndex = '10000';
    notification.style.fontSize = '14px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

    if (type === 'error') {
        notification.style.backgroundColor = '#f44336';
    } else if (type === 'warning') {
        notification.style.backgroundColor = '#ff9800';
    } else {
        notification.style.backgroundColor = '#2196F3';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Helper function to check if a target is within the capture popup
function isInPopup(target) {
    return capturePopup && capturePopup.contains(target);
}

// Helper function to escape HTML
function escapeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
} 