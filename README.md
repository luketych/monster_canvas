# Monster Canvas VSCode Extension

A VS Code extension that displays a canvas where Unicode characters and shapes can be dragged around and selected from palettes.

## Features

- Drag and drop Unicode characters on a canvas
- Add and resize shapes (circle, triangle, square)
- Select characters from a categorized Unicode character palette
- Select shapes from a shape palette
- Save and restore character positions and shapes
- Reset positions to default
- Reset shapes to default

## Project Structure

The project is organized into a modular structure for better maintainability:

```
src/
├── extension.js            # Main entry point for the extension
├── utils/
│   ├── constants.js        # Default data, shape types, and Unicode characters
│   └── storage.js          # Storage utility functions
├── webview/
│   ├── webviewContent.js   # HTML/CSS/JS content generation
│   └── webviewProvider.js  # Webview panel management
```

### Module Responsibilities

#### extension.js
- Registers the extension command
- Creates the webview provider
- Handles extension activation/deactivation

#### utils/constants.js
- Defines default character data
- Defines default shapes data
- Defines shape types (circle, square, triangle)
- Contains Unicode character sets for the palette

#### utils/storage.js
- Handles loading and saving character data
- Handles loading and saving shape data
- Provides utility functions for data management

#### webview/webviewContent.js
- Generates the HTML content for the webview
- Defines CSS styles for the UI
- Provides JavaScript for the canvas functionality
- Implements shape drawing and resizing

#### webview/webviewProvider.js
- Manages the webview panel lifecycle
- Handles messages from the webview
- Coordinates between the webview and extension storage

## Usage

1. Press `F5` to run the extension in a new VS Code window
2. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Run the command "Monster Canvas: Open Canvas"
4. Use the character palette to select Unicode characters
5. Click on the canvas to place selected characters
6. Drag characters to move them around
7. Select a shape from the shape palette to add shapes
8. Drag shapes to move them around
9. Use the resize handle (bottom-right corner) to resize shapes
10. Use the buttons to save positions, reset positions, or reset shapes

## Development

### Building and Running

1. Clone the repository
2. Run `npm install` to install dependencies
3. Press `F5` to launch the extension in debug mode

### Making Changes

- Modify the files in the `src` directory
- The extension will automatically reload when changes are made (in debug mode)
- Use the VS Code debugger to debug the extension

## License

This project is licensed under the MIT License.
