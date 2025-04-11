# DOM Capture Extension

A lightweight, scalable, and modular Chrome extension for capturing and managing DOM element and page metadata during user journeys across web applications.

## Purpose

This extension helps create structured JSON data dumps that log page-level and element-level metadata for integration with Digital Adoption Platforms (DAP). It allows you to:

- Toggle Capture Mode to select and capture DOM elements
- Store structured element and page data in JSON format
- Support cross-page journey flows with tracking of element-to-element transitions
- Export/download structured JSON dumps

## Features

- **Capture Mode**: Click on DOM elements to capture their metadata
- **Page Tracking**: Automatically captures page metadata when visiting new pages
- **Journey Tracking**: Maintains context across page navigation
- **Structured Data**: Enforces a standardized JSON schema for captured data
- **Export**: Generate and download JSON exports of all captured data

## Installation

### Development Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `capture_extension` folder
5. The extension should now be installed and ready to use

## Usage

1. Click the extension icon in your browser toolbar to open the popup
2. Toggle "Capture Mode" to begin capturing DOM elements
3. Navigate to the web pages you want to capture
4. Click on elements to capture their metadata
   - You'll be prompted to provide a description and optional KPI
5. Continue your journey across multiple pages as needed
6. When finished, click "Export Captured Data" to download the structured JSON

## JSON Schema

### Page-Level Schema

```json
{
  "page_id": "dashboard_page_v1",
  "url_pattern": "/dashboard",
  "framework": "React",
  "ui_version": "1.0",
  "description": "Dashboard main landing page",
  "KPI": "xyz",
  "updated_at": "2025-04-10T10:00:00Z",
  "from": null
}
```

### Element-Level Schema

```json
{
  "element_id": "user_settings_btn",
  "page_id": "dashboard_page_v1",
  "type": "button",
  "dom_selector": "#settings-button",
  "description": "Navigate to user settings",
  "version": "1.0",
  "KPI": "xyz",
  "updated_at": "2025-04-12T08:00:00Z",
  "status": "active",
  "from": null
}
```

### With Navigation Context

```json
{
  "element_id": "user_add_btn",
  "page_id": "dashboard_page_v1",
  "type": "button",
  "dom_selector": "#add-button",
  "description": "Add user",
  "version": "1.0",
  "updated_at": "2025-04-12T08:01:00Z",
  "status": "active",
  "from": [
    { "node": "user_settings_btn", "action": "click" },
    { "node": "user_dash_btn", "action": "click" }
  ]
}
```

## Architecture

The extension is built with a modular architecture:

1. **UI Handling Module**: Extension popup, toggles, and input fields
2. **DOM Capture Module**: Element selection logic, hover/click events, popup prompts
3. **Storage Management Module**: Handle all temporary storage in browser local storage
4. **Export Module**: Compile and export JSON dump based on schemas
5. **Cross-Page Flow Management**: Maintain journey context across page navigations

## Future Enhancements

- DOM versioning + mutation tracking
- LLM-based semantic tagging
- Centralized backend sync

## License

MIT 