/**
 * Main entry point for the webview JavaScript
 */

// Global variables
let characters = [];
let shapes = [];
let shapeTypes = [];
let unicodeCharacters = {};
let defaultCharacterData = [];
let defaultShapesData = [];
let nextCharacterId = 1;
let nextShapeId = 1;

/**
 * Initializes the webview
 * @param {Array} initialCharacters - Initial character data
 * @param {Array} initialShapes - Initial shape data
 * @param {Array} initialShapeTypes - Available shape types
 * @param {Object} initialUnicodeCharacters - Unicode character sets
 * @param {Array} initialDefaultCharacterData - Default character data for reset
 * @param {Array} initialDefaultShapesData - Default shapes data for reset
 * @param {Array} initialWorkspaceFiles - Initial workspace files and folders
 */
function init(initialCharacters, initialShapes, initialShapeTypes, initialUnicodeCharacters, initialDefaultCharacterData, initialDefaultShapesData, initialWorkspaceFiles) {
  // Set global variables
  characters = initialCharacters;
  shapes = initialShapes;
  shapeTypes = initialShapeTypes;
  unicodeCharacters = initialUnicodeCharacters;
  defaultCharacterData = initialDefaultCharacterData;
  defaultShapesData = initialDefaultShapesData;
  workspaceFiles = initialWorkspaceFiles || [];

  // Initialize usedFiles set with any existing files on the canvas
  usedFiles = new Set();
  characters.forEach(char => {
    if (char.metadata && char.metadata.path && char.metadata.type === 'file') {
      usedFiles.add(char.metadata.path);
    }
  });

  console.log('Initializing with workspace files:', initialWorkspaceFiles);
  console.log('Workspace files length:', workspaceFiles.length);

  // Set next IDs
  nextCharacterId = characters.length > 0 ? Math.max(...characters.map(c => c.id)) + 1 : 1;
  nextShapeId = shapes.length > 0 ? Math.max(...shapes.map(s => s.id)) + 1 : 1;

  // Initialize components
  initCanvas();
  initUI();
  initSidebar();
  populateFileExplorer();

  // Set up message listener for workspace file updates
  window.addEventListener('message', event => {
    const message = event.data;
    console.log('Received message:', message.command);
    if (message.command === 'updateWorkspaceFiles') {
      console.log('Received workspace files:', message.data ? message.data.length : 0);
      workspaceFiles = message.data;
      populateFileExplorer();
    }
  });

  // Add keyboard event listener for Escape key
  document.addEventListener('keydown', handleKeyDown);

  // Start drawing
  setInterval(drawCanvas, 100);
}

// Export the init function for use in webviewContent.js
window.init = init;
console.log('Main module loaded, init function exported');
