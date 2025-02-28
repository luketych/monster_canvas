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

  // Read the JavaScript file
  const mainJs = readFile('./js/main.js');

  // Inject the CSS into the HTML template
  htmlTemplate = htmlTemplate.replace('{{styles}}', `<style>\n${styles}\n</style>`);

  // Create the initialization script
  const initScript = `
    <script>
    // Initialize data
    characters = ${JSON.stringify(characterData)};
    shapes = ${JSON.stringify(shapes)};
    shapeTypes = ${shapeTypesData};
    unicodeCharacters = ${JSON.stringify(unicodeCharacters)};
    defaultCharacterData = ${defaultCharacterData};
    defaultShapesData = ${defaultShapesData};
    workspaceFiles = ${workspaceFiles || '[]'};
    
    // Acquire the VS Code API once at the top level
    const vscode = acquireVsCodeApi();
      
    // Initialize the webview when the DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
      // Initialize the webview
      init(characters, shapes, shapeTypes, unicodeCharacters, defaultCharacterData, defaultShapesData, workspaceFiles);
    });
    </script>
  `;

  // Combine JavaScript and inject into the HTML template
  const combinedJs = `
    <script>
      ${mainJs}
    </script>
    ${initScript}
  `;

  htmlTemplate = htmlTemplate.replace('{{scripts}}', combinedJs);

  return htmlTemplate;
}

module.exports = {
  getWebviewContent
};
