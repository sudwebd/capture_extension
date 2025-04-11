// UI Handling Module for DOM Capture Extension
document.addEventListener('DOMContentLoaded', async () => {
    // Import the ID registry manager
    const idRegistryManager = await import(chrome.runtime.getURL("src/modules/id-registry-manager.js"));

    // Get UI elements
    const captureToggle = document.getElementById('capture-toggle');
    const exportBtn = document.getElementById('export-btn');
    const resetBtn = document.getElementById('reset-btn');
    const elementsCount = document.getElementById('elements-count');
    const pagesCount = document.getElementById('pages-count');
    const navigationStatus = document.getElementById('navigation-status');
    const platformSelect = document.getElementById('platform-select');
    const addPlatformBtn = document.getElementById('add-platform-btn');

    // Initialize UI state from storage
    const {
        captureMode = false,
        elementData = [],
        pageData = [],
        pendingNavigation = false
    } = await chrome.storage.local.get([
        'captureMode',
        'elementData',
        'pageData',
        'pendingNavigation'
    ]);

    // Initialize platform selector
    await initializePlatformSelector();

    captureToggle.checked = captureMode;
    updateCounts(elementData, pageData);
    exportBtn.disabled = elementData.length === 0 && pageData.length === 0;

    // If there's a pending navigation, show the navigation status
    if (pendingNavigation) {
        showNavigationStatus(true);

        // Reset the navigation state after a delay
        setTimeout(async () => {
            await chrome.storage.local.set({ pendingNavigation: false });
            showNavigationStatus(false);
        }, 5000);
    } else {
        showNavigationStatus(false);
    }

    // Platform selector functionality
    platformSelect.addEventListener('change', async () => {
        const platformKey = platformSelect.value;
        await idRegistryManager.setPlatformKey(platformKey);
        chrome.runtime.sendMessage({
            action: 'setPlatformKey',
            platformKey: platformKey
        });
        showStatus(`Platform switched to: ${platformKey}`);
    });

    // Add new platform button
    addPlatformBtn.addEventListener('click', async () => {
        const platformKey = prompt('Enter a new platform name:');
        if (platformKey && platformKey.trim() !== '') {
            // Add to dropdown
            const option = document.createElement('option');
            option.value = platformKey.trim();
            option.textContent = platformKey.trim();
            platformSelect.appendChild(option);

            // Select the new platform
            platformSelect.value = platformKey.trim();

            // Set as current platform
            await idRegistryManager.setPlatformKey(platformKey.trim());
            chrome.runtime.sendMessage({
                action: 'setPlatformKey',
                platformKey: platformKey.trim()
            });

            showStatus(`New platform added: ${platformKey.trim()}`);
        }
    });

    // Toggle capture mode
    captureToggle.addEventListener('change', async () => {
        const isActive = captureToggle.checked;

        // Update storage
        await chrome.storage.local.set({ captureMode: isActive });

        // Notify content script about mode change
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            chrome.tabs.sendMessage(tab.id, {
                action: isActive ? 'enableCapture' : 'disableCapture'
            });
        }

        // Update UI
        showStatus(`Capture mode ${isActive ? 'enabled' : 'disabled'}`);
    });

    // Export captured data
    exportBtn.addEventListener('click', async () => {
        const { elementData = [], pageData = [] } = await chrome.storage.local.get([
            'elementData',
            'pageData'
        ]);

        if (elementData.length === 0 && pageData.length === 0) {
            showStatus('No data to export');
            return;
        }

        // Get the current platform's ID registry
        const currentPlatformKey = await idRegistryManager.getPlatformKey();
        const allRegistries = await idRegistryManager.exportAllIdRegistries();

        // Prepare data for export
        const exportData = {
            pages: pageData,
            elements: elementData,
            platform: currentPlatformKey,
            registries: allRegistries,
            exportedAt: new Date().toISOString()
        };

        // Create and download a JSON file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dom-capture-export-${currentPlatformKey}-${new Date().toISOString().substring(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showStatus('Data exported successfully');
    });

    // Reset all captured data
    resetBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to reset all captured data?')) {
            // Reset the ID registry for the current platform
            await idRegistryManager.resetIdRegistry();

            await chrome.storage.local.set({
                elementData: [],
                pageData: [],
                lastElementId: null,
                pendingNavigation: false
            });

            updateCounts([], []);
            exportBtn.disabled = true;
            showNavigationStatus(false);
            showStatus('All data has been reset');

            // Notify background script that data was reset
            chrome.runtime.sendMessage({ action: 'dataReset' });
        }
    });

    // Listen for storage changes to update UI
    chrome.storage.onChanged.addListener((changes) => {
        // Update for element and page data changes
        if (changes.elementData || changes.pageData) {
            const elementData = changes.elementData ? changes.elementData.newValue : [];
            const pageData = changes.pageData ? changes.pageData.newValue : [];

            updateCounts(elementData, pageData);
            exportBtn.disabled = elementData.length === 0 && pageData.length === 0;
        }

        // Update for capture mode changes
        if (changes.captureMode) {
            captureToggle.checked = changes.captureMode.newValue;
        }

        // Update for navigation state changes
        if (changes.pendingNavigation) {
            showNavigationStatus(changes.pendingNavigation.newValue);
        }
    });

    // Helper function to initialize platform selector
    async function initializePlatformSelector() {
        // Get all registries to see what platforms we have
        const allRegistries = await idRegistryManager.exportAllIdRegistries();
        const currentPlatform = await idRegistryManager.getPlatformKey();

        // Clear dropdown except for default
        while (platformSelect.options.length > 1) {
            platformSelect.remove(1);
        }

        // Add all platforms from registries
        const platforms = Object.keys(allRegistries || {});
        platforms.forEach(platform => {
            if (platform !== 'default' && !Array.from(platformSelect.options).some(opt => opt.value === platform)) {
                const option = document.createElement('option');
                option.value = platform;
                option.textContent = platform;
                platformSelect.appendChild(option);
            }
        });

        // Set current platform
        platformSelect.value = currentPlatform || 'default';
    }

    // Helper function to update counts in UI
    function updateCounts(elements, pages) {
        elementsCount.textContent = `Elements captured: ${elements.length}`;
        pagesCount.textContent = `Pages visited: ${pages.length}`;
    }

    // Helper function to show/hide navigation status
    function showNavigationStatus(show) {
        if (show) {
            navigationStatus.classList.add('active');
        } else {
            navigationStatus.classList.remove('active');
        }
    }

    // Helper function to show status message
    function showStatus(message, type = 'info') {
        const status = document.createElement('div');
        status.textContent = message;
        status.style.marginTop = '10px';
        status.style.padding = '5px';
        status.style.backgroundColor = type === 'navigation' ? '#ff9800' : '#f0f0f0';
        status.style.color = type === 'navigation' ? 'white' : 'black';
        status.style.borderRadius = '3px';
        status.style.fontSize = '12px';

        const container = document.querySelector('.status');
        container.appendChild(status);

        setTimeout(() => {
            if (container.contains(status)) {
                container.removeChild(status);
            }
        }, 3000);
    }
}); 