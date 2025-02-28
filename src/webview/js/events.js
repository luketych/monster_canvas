/**
 * Event handlers for canvas interactions
 */

// Import canvas functions
const { isPointInShape, isPointNearResizeHandle, drawCanvas } = require('./canvas');

/**
 * Handles mouse down events on the canvas
 * @param {MouseEvent} e - The mouse event
 */
function handleCanvasMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Check for resize handle
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (isPointNearResizeHandle(mouseX, mouseY, shapes[i])) {
      resizingShape = shapes[i];
      canvas.style.cursor = 'nwse-resize';
      return;
    }
  }

  // Add new shape
  if (currentMode === 'drag' && selectedShapeType) {
    const newShape = {
      id: nextShapeId++,
      type: selectedShapeType,
      x: mouseX - 40,
      y: mouseY - 40,
      width: 80,
      height: 80,
      color: getRandomColor()
    };

    shapes.push(newShape);
    drawCanvas();

    const vscode = acquireVsCodeApi();
    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    return;
  }

  // Add new character
  if (currentMode === 'drag' && selectedCharacter) {
    const newChar = {
      id: nextCharacterId++,
      character: selectedCharacter,
      x: mouseX,
      y: mouseY,
      size: 50,
      color: getRandomColor()
    };

    characters.push(newChar);
    drawCanvas();

    const vscode = acquireVsCodeApi();
    vscode.postMessage({
      command: 'saveCoordinates',
      data: characters,
      autoSave: true
    });
    return;
  }

  // Check for dragging shape
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (isPointInShape(mouseX, mouseY, shapes[i])) {
      draggedShape = shapes[i];
      offsetX = mouseX - draggedShape.x;
      offsetY = mouseY - draggedShape.y;

      shapes.splice(i, 1);
      shapes.push(draggedShape);

      drawCanvas();
      return;
    }
  }

  // Check for dragging character
  for (let i = characters.length - 1; i >= 0; i--) {
    const char = characters[i];

    ctx.font = char.size + 'px Arial';
    const metrics = ctx.measureText(char.character);
    const width = metrics.width;
    const height = char.size;

    if (mouseX >= char.x - width / 2 - 5 &&
      mouseX <= char.x + width / 2 + 5 &&
      mouseY >= char.y - height / 2 - 5 &&
      mouseY <= char.y + height / 2 + 5) {

      draggedCharacter = char;
      offsetX = mouseX - char.x;
      offsetY = mouseY - char.y;

      characters.splice(i, 1);
      characters.push(draggedCharacter);

      drawCanvas();
      return;
    }
  }
}

/**
 * Handles mouse move events on the canvas
 * @param {MouseEvent} e - The mouse event
 */
function handleCanvasMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Handle resizing
  if (resizingShape) {
    resizingShape.width = Math.max(20, mouseX - resizingShape.x);
    resizingShape.height = Math.max(20, mouseY - resizingShape.y);
    drawCanvas();
    return;
  }

  // Handle dragging shape
  if (draggedShape) {
    draggedShape.x = mouseX - offsetX;
    draggedShape.y = mouseY - offsetY;

    draggedShape.x = Math.max(0, Math.min(canvas.width - draggedShape.width, draggedShape.x));
    draggedShape.y = Math.max(0, Math.min(canvas.height - draggedShape.height, draggedShape.y));

    drawCanvas();
    return;
  }

  // Handle dragging character
  if (draggedCharacter) {
    draggedCharacter.x = mouseX - offsetX;
    draggedCharacter.y = mouseY - offsetY;

    draggedCharacter.x = Math.max(draggedCharacter.size / 2, Math.min(canvas.width - draggedCharacter.size / 2, draggedCharacter.x));
    draggedCharacter.y = Math.max(draggedCharacter.size / 2, Math.min(canvas.height - draggedCharacter.size / 2, draggedCharacter.y));

    drawCanvas();
    return;
  }

  // Update cursor
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (isPointNearResizeHandle(mouseX, mouseY, shapes[i])) {
      canvas.style.cursor = 'nwse-resize';
      return;
    }
    if (isPointInShape(mouseX, mouseY, shapes[i])) {
      canvas.style.cursor = 'move';
      return;
    }
  }

  for (let i = characters.length - 1; i >= 0; i--) {
    const char = characters[i];
    ctx.font = char.size + 'px Arial';
    const metrics = ctx.measureText(char.character);
    const width = metrics.width;
    const height = char.size;

    if (mouseX >= char.x - width / 2 - 5 &&
      mouseX <= char.x + width / 2 + 5 &&
      mouseY >= char.y - height / 2 - 5 &&
      mouseY <= char.y + height / 2 + 5) {

      canvas.style.cursor = 'move';
      return;
    }
  }

  canvas.style.cursor = selectedCharacter || selectedShapeType ? 'cell' : 'default';
}

/**
 * Handles mouse up events on the canvas
 */
function handleCanvasMouseUp() {
  if (resizingShape) {
    const vscode = acquireVsCodeApi();
    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    resizingShape = null;
  }
  else if (draggedShape) {
    const vscode = acquireVsCodeApi();
    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    draggedShape = null;
  }
  else if (draggedCharacter) {
    const vscode = acquireVsCodeApi();
    vscode.postMessage({
      command: 'saveCoordinates',
      data: characters,
      autoSave: true
    });
    draggedCharacter = null;
  }
  drawCanvas();
}

/**
 * Handles mouse leave events on the canvas
 */
function handleCanvasMouseLeave() {
  if (resizingShape || draggedShape) {
    const vscode = acquireVsCodeApi();
    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    resizingShape = null;
    draggedShape = null;
  }
  else if (draggedCharacter) {
    const vscode = acquireVsCodeApi();
    vscode.postMessage({
      command: 'saveCoordinates',
      data: characters,
      autoSave: true
    });
    draggedCharacter = null;
  }
  drawCanvas();
}

// Export functions
module.exports = {
  handleCanvasMouseDown,
  handleCanvasMouseMove,
  handleCanvasMouseUp,
  handleCanvasMouseLeave
};
