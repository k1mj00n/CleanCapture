# CleanCapture

CleanCapture is a custom Chrome extension built with Manifest V3 that lets you capture, edit, and print (or save as PDF) any webpage. With interactive controls and keyboard shortcuts, you can reposition elements, centre-align them, delete unwanted parts, and even undo changes—all while retaining the original page’s style (by capturing its external CSS). When printing, the extension hides all editing controls and duplicate headers, resulting in a clean, professional PDF.

## Features

- **Capture Page Content:**  
  Captures the webpage's body content along with external stylesheet links so that the original look is preserved.

- **Interactive Editing:**  
  Click any element to reveal an on‑screen control panel with buttons to move the element up, down, left, right, centre-align it, or delete it.  
  Use keyboard arrows for movement and the Delete key to remove the element.

- **Undo Functionality:**  
  Easily undo the last change with the Undo button or by pressing Ctrl+Z (Cmd+Z on macOS).

- **Keyboard Shortcuts Info:**  
  A question mark icon displays a popup with all available keyboard shortcuts when hovered.

- **Print Optimization:**  
  When you click “Save as PDF,” the extension hides UI controls and duplicate header elements so that only the first header appears—with proper page margins—ensuring a neat PDF layout.

## Installation

1. **Clone or Download the Repository:**  
   ```bash
   git clone https://github.com/your-username/CleanCapture.git
   ```
2. **Load the Extension in Chrome:**  
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable Developer Mode (toggle in the top-right).
   - Click **Load unpacked** and select the `CleanCapture` folder.

## Usage

1. **Capture a Webpage:**  
   Navigate to any webpage and click the CleanCapture extension icon. The extension will capture the page’s content and open a new tab where you can edit the page.

2. **Edit the Page:**  
   - **Interactive Controls:** Click on any element to reveal the control panel. Use the on‑screen buttons or the keyboard (Arrow keys) to move the element.  
   - **Centre-Align:** Click the Center button (or use the keyboard shortcut) to horizontally centre the element while keeping it in the document flow.  
   - **Delete:** Click the Delete button or press the Delete key to remove the selected element.  
   - **Undo:** Use the Undo button or press Ctrl+Z (Cmd+Z on macOS) to revert the last change.
   - **Keyboard Shortcuts:** Hover over the question mark icon to view all available keyboard shortcuts.

3. **Print as PDF:**  
   Click **Save as PDF** to open the browser’s print dialog. The extension automatically hides editing controls and duplicate headers so that your PDF is cleanly formatted with proper margins.

## Development

CleanCapture is built with Manifest V3. The key files include:

- **manifest.json:**  
  Contains metadata, permissions, and resource declarations for the extension.

- **background.js:**  
  A service worker that captures the active tab’s content (body, base URL, and CSS links).

- **cleancapture.html:**  
  The UI that displays the captured page and the editing controls. It also contains the Save as PDF, Undo, and shortcut info elements.

- **cleancapture.js:**  
  Contains all the JavaScript for interactive editing, keyboard support, the control panel, and undo functionality.

- **cleancapture.css:**  
  Styles the extension’s UI—including layout defaults, control panel styling, and print media queries to hide unwanted elements and set proper margins for PDF output.

## License

This project is licensed under the [MIT License](LICENSE).

## Contributing

Contributions are welcome! If you have improvements, bug fixes, or new feature ideas, please fork the repository and open a pull request or file an issue.