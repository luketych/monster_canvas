/**
 * Utility functions for handling storage operations
 */

/**
 * Loads character data from extension storage
 * @param {vscode.ExtensionContext} context - The extension context
 * @param {Array} defaultData - Default data to use if no saved data exists
 * @returns {Array} The loaded character data
 */
function loadCharacterData(context, defaultData) {
  const savedData = context.globalState.get('monsterCharacterData');
  return savedData || defaultData;
}

/**
 * Loads shape data from extension storage
 * @param {vscode.ExtensionContext} context - The extension context
 * @param {Array} defaultData - Default data to use if no saved data exists
 * @returns {Array} The loaded shape data
 */
function loadShapeData(context, defaultData) {
  const savedData = context.globalState.get('monsterCanvasShapes');
  return savedData || defaultData;
}

/**
 * Saves character data to extension storage
 * @param {vscode.ExtensionContext} context - The extension context
 * @param {Array} data - The character data to save
 * @param {boolean} showNotification - Whether to show a notification
 * @param {Function} showMessage - Function to show a notification message
 */
function saveCharacterData(context, data, showNotification, showMessage) {
  context.globalState.update('monsterCharacterData', data);

  if (showNotification && showMessage) {
    showMessage('Character positions saved!');
  }
}

/**
 * Saves shape data to extension storage
 * @param {vscode.ExtensionContext} context - The extension context
 * @param {Array} data - The shape data to save
 * @param {boolean} showNotification - Whether to show a notification
 * @param {Function} showMessage - Function to show a notification message
 */
function saveShapeData(context, data, showNotification, showMessage) {
  context.globalState.update('monsterCanvasShapes', data);

  if (showNotification && showMessage) {
    showMessage('Shapes saved!');
  }
}

/**
 * Resets shapes to default
 * @param {vscode.ExtensionContext} context - The extension context
 * @param {Array} defaultData - The default shape data
 * @param {Function} showMessage - Function to show a notification message
 * @returns {Array} The default shape data
 */
function resetShapes(context, defaultData, showMessage) {
  const resetData = JSON.parse(JSON.stringify(defaultData));
  context.globalState.update('monsterCanvasShapes', resetData);

  if (showMessage) {
    showMessage('Shapes reset to default!');
  }

  return resetData;
}

/**
 * Resets character positions to default
 * @param {vscode.ExtensionContext} context - The extension context
 * @param {Array} defaultData - The default character data
 * @param {Function} showMessage - Function to show a notification message
 * @returns {Array} The default character data
 */
function resetCharacterPositions(context, defaultData, showMessage) {
  const resetData = JSON.parse(JSON.stringify(defaultData));
  context.globalState.update('monsterCharacterData', resetData);

  if (showMessage) {
    showMessage('Positions reset and saved.');
  }

  return resetData;
}

module.exports = {
  loadCharacterData,
  loadShapeData,
  saveCharacterData,
  saveShapeData,
  resetCharacterPositions,
  resetShapes
};
