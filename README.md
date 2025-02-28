# Monster Canvas VSCode Extension

A VS Code extension that displays a canvas where images can be dragged around.

## Development with Dev Containers

This project is configured to use VS Code Dev Containers, which provides a consistent development environment across different machines.

### Prerequisites

To develop this extension using Dev Containers, you need:

1. [Visual Studio Code](https://code.visualstudio.com/)
2. [Docker](https://www.docker.com/products/docker-desktop)
3. [VS Code Remote - Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### Getting Started

1. Clone this repository
2. Open the project in VS Code
3. When prompted, click "Reopen in Container" or run the "Remote-Containers: Reopen in Container" command from the Command Palette (F1)
4. VS Code will build the Docker container and open the project inside it
5. Once the container is running, you can develop, debug, and test the extension as usual

### Running the Extension

To run the extension in development mode:

1. Press F5 or select "Run and Debug" from the Activity Bar
2. A new VS Code window will open with the extension loaded
3. Use the "Monster Canvas: Open Canvas" command from the Command Palette to open the canvas

### Adding Additional Extensions

To add more extensions to the development container:

1. Open `.devcontainer/devcontainer.json`
2. Add the extension ID to the `extensions` array under `customizations.vscode`
3. Rebuild the container using the "Remote-Containers: Rebuild Container" command

### Running Alongside Other Extensions

The Dev Container setup allows you to run this extension alongside other extensions. To do this:

1. Make sure the extension you want to run alongside Monster Canvas is installed in your local VS Code
2. Add the extension ID to the `extensions` array in `.devcontainer/devcontainer.json`
3. Rebuild the container
4. When you run the extension in debug mode, both extensions will be available in the Extension Development Host

### Customizing the Dev Container

You can customize the Dev Container environment by:

1. Modifying the `Dockerfile` to install additional system dependencies
2. Updating `docker-compose.yml` to add services or configure environment variables
3. Editing `.devcontainer/devcontainer.json` to configure VS Code settings and extensions

## Features

- Display a canvas with draggable characters and shapes
- Add new characters from a palette of Unicode characters
- Add shapes (circles, squares, triangles)
- Save and reset positions

## Structure

The extension is organized as follows:

- `src/extension.js`: Main extension entry point
- `src/webview/`: Webview-related code
  - `src/webview/html/`: HTML templates
  - `src/webview/styles/`: CSS styles
  - `src/webview/js/`: JavaScript code
- `src/utils/`: Utility functions and constants

## Development Tasks

The following npm scripts are available:

- `npm run lint`: Run ESLint to check code quality
- `npm run test`: Run tests
- `npm run package`: Package the extension into a VSIX file
- `npm run publish`: Publish the extension to the VS Code Marketplace
