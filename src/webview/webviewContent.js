/**
 * Generates the HTML content for the webview
 */
const fs = require('fs');
const path = require('path');
const { unicodeCharacters } = require('../utils/constants');

/**
 * Reads a file and returns its contents
 * @param {string} filePath - Path to the file
 * @returns {string} File contents
 */
function readFile(filePath) {
  return fs.readFileSync(path.join(__dirname, filePath), 'utf8');
}

/**
 * Returns the HTML content for the webview
 * @param {Array} characterData - Array of character objects with coordinates
 * @param {Array} shapes - Array of shape objects
 * @param {string} defaultCharacterData - JSON string of default character data for reset functionality
 * @param {string} defaultShapesData - JSON string of default shapes data for reset functionality
 * @param {string} shapeTypesData - JSON string of available shape types
 * @param {string} workspaceFiles - JSON string of workspace files and folders
 * @returns {string} HTML content
 */
function getWebviewContent(characterData, shapes, defaultCharacterData, defaultShapesData, shapeTypesData, workspaceFiles) {
  // Read the HTML template
  let htmlTemplate = readFile('./html/template.html');

  // Read the CSS
  const styles = readFile('./styles/styles.css');

  // Read the JavaScript files
  const utilsJs = readFile('./js/utils.js');
  const canvasJs = readFile('./js/canvas.js');
  const eventsJs = readFile('./js/events.js');
  const uiJs = readFile('./js/ui.js');
  const explorerJs = readFile('./js/explorer.js');
  const mainJs = readFile('./js/main.js');

  // Inject the CSS into the HTML template
  htmlTemplate = htmlTemplate.replace('{{styles}}', `<style>\n${styles}\n</style>`);

  // We don't need a separate initialization script anymore

  // Combine JavaScript and inject into the HTML template
  const combinedJs = `
    <script>
      // Acquire the VS Code API once at the top level
      const vscode = acquireVsCodeApi();
    </script>
    <script>
      ${mainJs}
    </script>
    <script>
      // Initialize the webview when the DOM is loaded
      document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, initializing webview');
        // Initialize the webview with the data
        init(
          ${JSON.stringify(characterData)},
          ${JSON.stringify(shapes)},
          ${shapeTypesData},
          ${JSON.stringify(unicodeCharacters)},
          ${defaultCharacterData},
          ${defaultShapesData},
          ${workspaceFiles || '[]'}
        );
      });
    </script>
  `;

  htmlTemplate = htmlTemplate.replace('{{scripts}}', combinedJs);

  return htmlTemplate;
}

module.exports = {
  getWebviewContent
};
