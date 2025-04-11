# DAP Capture Extension

A Chrome extension for capturing web elements and their interactions in a structured flow.

## Purpose

This extension helps create structured JSON data dumps that log page-level and element-level metadata for integration with Digital Adoption Platforms (DAP). It allows you to:

- Toggle Capture Mode to select and capture DOM elements
- Store structured element and page data in JSON format
- Support cross-page journey flows with tracking of element-to-element transitions
- Export/download structured JSON dumps

## Installation and Setup

1. Clone this repository to your local machine
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Usage Instructions

### Starting a New Capture Session

1. **Add Extension to Chrome**
   - Follow the installation steps above
   - Pin the extension to your toolbar for easy access

2. **Begin Capture**
   - Click the extension icon in your toolbar
   - Toggle "Capture Mode" to start capturing elements

3. **Element Selection Process**
   - Click on the desired element on the webpage
   - A popup will appear requesting information
   - Provide a clear description (mandatory)
   - Add KPI metrics if applicable (optional)
   - Click "Confirm" to add to capture

4. **Continuing the Flow**
   - Repeat the selection process for each element
   - Maintain the exact sequence of your intended flow
   - For elements leading to page navigation, check "Mark as navigation trigger"

5. **Multiple Page Flows**
   - After completing elements on one page, select the last element
   - Check "Mark as navigation trigger" in its popup
   - Navigate to the next page and continue capturing

6. **Exporting Data**
   - Click the extension icon
   - Select "Export Captured Data" to save your flow

7. **Starting a New Flow**
   - Go to `chrome://extensions/`
   - Refresh the extension
   - Refresh your target webpage
   - Begin new capture session

> Note: Currently, the "Reset all Data" function may be unstable. Instead, refresh the extension and webpage to start a new session.

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
  "updated_at": "2025-04-10T10:00:00Z"
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

## System Architecture

### Components

* **Background Service Worker**
  - Manages extension lifecycle
  - Handles communication between components
  - Maintains capture session state

* **Content Script**
  - Injects capture functionality into webpages
  - Handles element selection and highlighting
  - Manages popup interactions

* **Popup Interface**
  - Provides user controls for capture mode
  - Displays capture status
  - Offers export and reset functionality

* **Storage System**
  - Chrome storage API integration
  - Maintains captured element data
  - Preserves flow sequence information

### Data Structure

* **Element Capture Format**
  - Element description
  - XPath/selector information
  - Navigation flags
  - Associated KPIs
  - Sequence information

* **Flow Organization**
  - Sequential storage of elements
  - Page transition markers
  - Navigation triggers

### Features

* **Element Selection**
  - Visual highlighting
  - Accurate DOM element identification
  - Popup for data entry

* **Flow Management**
  - Sequence preservation
  - Multi-page support
  - Navigation handling

* **Data Export**
  - Structured JSON output
  - Complete flow documentation
  - Reusable capture format

## Future Enhancements

- DOM versioning + mutation tracking
- LLM-based semantic tagging
- Centralized backend sync

## License

MIT