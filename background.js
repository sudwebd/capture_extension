// Background script for DOM Capture Extension
// Handles cross-page flow management and maintains extension state

// State management for navigation tracking
let temporaryCaptureDisabled = false;
let shouldResumeCapture = false;
let lastElementIdBeforeNavigation = null;

// Initialize default state when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        captureMode: false,
        elementData: [],
        pageData: [],
        lastElementId: null,
        pendingNavigation: false
    });

    console.log('DOM Capture Extension installed successfully');
});

// Listen for navigation events to track cross-page journeys
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only run when the page has completed loading
    if (changeInfo.status === 'complete' && tab.url) {
        // Check if we need to resume capture mode after navigation
        if (shouldResumeCapture) {
            // Notify content script that it should be in capture mode
            chrome.tabs.sendMessage(tabId, {
                action: 'checkPendingNavigation',
                resumeCapture: true
            }).catch(() => {
                // Content script may not be ready yet, this is expected
                console.log('Content script not ready yet for navigation resume');
                // Try again after a delay
                setTimeout(() => {
                    chrome.tabs.sendMessage(tabId, {
                        action: 'checkPendingNavigation',
                        resumeCapture: true
                    }).catch(() => {
                        console.log('Failed to resume capture mode after retry');
                    });
                }, 1000);
            });

            // Reset the navigation tracking state
            shouldResumeCapture = false;
            temporaryCaptureDisabled = false;
        } else {
            // Normal check for active capture mode
            chrome.storage.local.get(['captureMode'], ({ captureMode }) => {
                if (captureMode) {
                    // Notify content script that it should be in capture mode
                    chrome.tabs.sendMessage(tabId, { action: 'enableCapture' }).catch(() => {
                        // Content script may not be ready yet, this is expected
                        console.log('Content script not ready yet');
                    });
                }
            });
        }
    }
});

// Listen for messages from the content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle special background processing for navigation
    if (message.action === 'temporaryDisableForNavigation') {
        console.log('Temporarily disabling capture mode for navigation');
        temporaryCaptureDisabled = true;
        shouldResumeCapture = true;

        // Store the last element ID to maintain journey continuity
        lastElementIdBeforeNavigation = message.lastElementId;

        // Set a flag in storage to indicate pending navigation
        chrome.storage.local.set({
            pendingNavigation: true,
            lastNavigationElementId: message.lastElementId
        });

        sendResponse({ success: true });
    } else if (message.action === 'captureModeChanged') {
        // If user manually toggles capture mode, update our internal state
        if (!message.isEnabled) {
            shouldResumeCapture = false;
            temporaryCaptureDisabled = false;
        }

        sendResponse({ success: true });
    } else if (message.action === 'logCapturedElement') {
        console.log('Element captured:', message.data);
        sendResponse({ success: true });
    } else if (message.action === 'logCapturedPage') {
        console.log('Page captured:', message.data);
        sendResponse({ success: true });
    }

    return true; // Needed for async response
});

// Storage change listener for debugging
chrome.storage.onChanged.addListener((changes, namespace) => {
    for (let key in changes) {
        const storageChange = changes[key];
        console.log(`Storage key "${key}" changed. New value:`, storageChange.newValue);
    }
}); 