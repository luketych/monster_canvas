/**
 * Event handlers for canvas interactions
 */

// State variables for event handling
let offsetX = 0;
let offsetY = 0;
let isCarryingMode = false;

/**
 * Handles mouse down events on the canvas
 * @param {MouseEvent} e - The mouse event
 */
function handleCanvasMouseDown(e) {
  e.preventDefault();

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

  // Reset hover state for all characters
  characters.forEach(char => {
    char.isHovered = false;
  });

  // If in carrying mode, update the position of the carried element
  if (isCarryingMode) {
    if (draggedCharacter) {
      draggedCharacter.x = mouseX;
      draggedCharacter.y = mouseY;
      drawCanvas();
    } else if (draggedShape) {
      draggedShape.x = mouseX - draggedShape.width / 2;
      draggedShape.y = mouseY - draggedShape.height / 2;
      drawCanvas();
    }
    return;
  }

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

  // First check if we're in delete mode and let the canvas handle cursor updates
  if (!window.canvas.updateCursor(mouseX, mouseY)) {
    // If not in delete mode or no item under cursor in delete mode, use regular cursor logic
    let cursorSet = false;

    // Check for resize handles
    for (let i = shapes.length - 1; i >= 0; i--) {
      if (isPointNearResizeHandle(mouseX, mouseY, shapes[i])) {
        canvas.style.cursor = 'nwse-resize';
        cursorSet = true;
        break;
      }
    }

    if (!cursorSet) {
      // Check for shapes
      for (let i = shapes.length - 1; i >= 0; i--) {
        if (isPointInShape(mouseX, mouseY, shapes[i])) {
          canvas.style.cursor = 'pointer';
          cursorSet = true;
          break;
        }
      }
    }

    if (!cursorSet) {
      // Check for characters
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

          canvas.style.cursor = 'pointer';
          cursorSet = true;

          // Set hover state for this character
          char.isHovered = true;

          // Redraw canvas to show the tooltip
          drawCanvas();

          break;
        }
      }
    }

    if (!cursorSet) {
      canvas.style.cursor = selectedCharacter || selectedShapeType ? 'cell' : 'default';
    }
  }
}

/**
 * Handles mouse up events on the canvas
 */
function handleCanvasMouseUp() {
  if (resizingShape) {
    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    resizingShape = null;
  }
  else if (draggedShape) {
    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    draggedShape = null;
  }
  else if (draggedCharacter) {
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
  // Reset hover state for all characters
  characters.forEach(char => {
    char.isHovered = false;
  });

  if (resizingShape || draggedShape) {
    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    resizingShape = null;
    draggedShape = null;
  }
  else if (draggedCharacter) {
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
 * Handles click events on the canvas
 * @param {MouseEvent} e - The mouse event
 */
function handleCanvasClick(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  console.log('Canvas click at', mouseX, mouseY, 'Carrying mode:', isCarryingMode, 'Current mode:', currentMode);

  // Handle delete mode
  if (currentMode === 'delete') {
    // Check for shapes to delete
    for (let i = shapes.length - 1; i >= 0; i--) {
      if (isPointInShape(mouseX, mouseY, shapes[i])) {
        // Remove the shape
        shapes.splice(i, 1);

        // Save the updated shapes
        vscode.postMessage({
          command: 'saveShapes',
          data: shapes,
          autoSave: true
        });

        drawCanvas();
        return;
      }
    }

    // Check for characters to delete
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

        // Remove the character
        characters.splice(i, 1);

        // If it was a file or folder, remove it from usedFiles and update the file explorer
        if (char.metadata && char.metadata.path) {
          usedFiles.delete(char.metadata.path);
          // Update the file explorer to show the file/folder as available again
          updateFileExplorerItem(char.metadata.path, false);
        }

        // Save the updated characters
        vscode.postMessage({
          command: 'saveCoordinates',
          data: characters,
          autoSave: true
        });

        drawCanvas();

        // Update the Canvas Files panel if it's visible
        if (isCanvasExplorerVisible) {
          populateCanvasExplorer();
        }
        return;
      }
    }

    return;
  }

  // If we're already carrying something, drop it at the current location
  if (isCarryingMode) {
    if (draggedCharacter) {
      draggedCharacter.x = mouseX;
      draggedCharacter.y = mouseY;

      vscode.postMessage({
        command: 'saveCoordinates',
        data: characters,
        autoSave: true
      });

      draggedCharacter = null;
    } else if (draggedShape) {
      draggedShape.x = mouseX - draggedShape.width / 2;
      draggedShape.y = mouseY - draggedShape.height / 2;

      vscode.postMessage({
        command: 'saveShapes',
        data: shapes,
        autoSave: true
      });

      draggedShape = null;
    }

    isCarryingMode = false;
    canvas.style.cursor = 'default';
    drawCanvas();
    return;
  }

  // Check for resize handle
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (isPointNearResizeHandle(mouseX, mouseY, shapes[i])) {
      // For resize, we'll still use the traditional drag approach
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

    vscode.postMessage({
      command: 'saveCoordinates',
      data: characters,
      autoSave: true
    });
    return;
  }

  // Check for picking up a shape
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (isPointInShape(mouseX, mouseY, shapes[i])) {
      draggedShape = shapes[i];
      isCarryingMode = true;
      canvas.style.cursor = 'move';

      // Move to top of rendering order
      shapes.splice(i, 1);
      shapes.push(draggedShape);

      drawCanvas();
      return;
    }
  }

  // Check for picking up a character
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
      isCarryingMode = true;
      canvas.style.cursor = 'move';

      // Move to top of rendering order
      characters.splice(i, 1);
      characters.push(draggedCharacter);

      drawCanvas();
      return;
    }
  }
}

/**
 * Handles keyboard events
 * @param {KeyboardEvent} e - The keyboard event
 */
function handleKeyDown(e) {
  // If Escape key is pressed and we have a dragged element, release it
  if (e.key === 'Escape' && (draggedCharacter || draggedShape || resizingShape || isCarryingMode)) {
    console.log('Escape key pressed, releasing dragged elements');
    releaseAllDraggedElements();
  }
}

/**
 * Releases all dragged elements
 */
function releaseAllDraggedElements() {
  if (resizingShape) {
    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    resizingShape = null;
  }

  if (draggedShape) {
    vscode.postMessage({
      command: 'saveShapes',
      data: shapes,
      autoSave: true
    });
    draggedShape = null;
  }

  if (draggedCharacter) {
    vscode.postMessage({
      command: 'saveCoordinates',
      data: characters,
      autoSave: true
    });
    draggedCharacter = null;
  }

  // Reset carrying mode
  isCarryingMode = false;

  // Reset cursor
  canvas.style.cursor = 'default';

  drawCanvas();
}

/**
 * Handles drag over events on the canvas
 * @param {DragEvent} e - The drag event
 */
function handleCanvasDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}

/**
 * Handles drop events on the canvas
 * @param {DragEvent} e - The drop event
 */
function handleCanvasDrop(e) {
  e.preventDefault();
  console.log('DEBUG: handleCanvasDrop called');

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  try {
    const dataTransfer = e.dataTransfer.getData('text/plain');
    console.log('DEBUG: Drop data transfer:', dataTransfer);

    const data = JSON.parse(dataTransfer);
    console.log('DEBUG: Parsed drop data:', data);

    if (data && data.name) {
      console.log(`DEBUG: Processing drop for ${data.name} (${data.type}) at path: ${data.path}`);

      // Check if this file/folder is already on the canvas
      const isUsed = usedFiles.has(data.path);
      console.log(`DEBUG: Is this path already used? ${isUsed}`);

      if (isUsed) {
        // Find the existing character and flash it
        const existingChar = characters.find(char =>
          char.metadata && char.metadata.path === data.path
        );
        console.log(`DEBUG: Existing character found:`, existingChar ? true : false);

        if (existingChar) {
          console.log(`DEBUG: Flashing existing character instead of adding new one`);
          flashCharacterOnCanvas(existingChar);
          return; // Don't add it again
        } else {
          console.log(`DEBUG: Path is marked as used but no character found with this path`);
          // This is an inconsistent state - the path is marked as used but no character has it
          // Let's remove it from usedFiles to allow adding it again
          console.log(`DEBUG: Removing path from usedFiles to allow adding it`);
          usedFiles.delete(data.path);
        }
      }

      // Create a new character with the file/folder name
      const newChar = {
        id: nextCharacterId++,
        character: data.type === 'folder' ? '📁' : '📄',
        x: mouseX,
        y: mouseY,
        size: 50,
        color: getRandomColor(),
        metadata: {
          name: data.name,
          path: data.path,
          type: data.type
        }
      };
      console.log(`DEBUG: Created new character:`, newChar);

      characters.push(newChar);
      console.log(`DEBUG: Added character to characters array. New length:`, characters.length);

      // Mark the file/folder as used
      usedFiles.add(data.path);
      console.log(`DEBUG: Added path to usedFiles. New size:`, usedFiles.size);

      // Update the file explorer to show the file/folder as greyed out
      updateFileExplorerItem(data.path, true);

      drawCanvas();

      vscode.postMessage({
        command: 'saveCoordinates',
        data: characters,
        autoSave: true
      });

      // Log the final state
      console.log(`DEBUG: Drop operation completed successfully`);
      debugUsedFiles();

      // Update the Canvas Files panel if it's visible
      if (isCanvasExplorerVisible) {
        populateCanvasExplorer();
      }
    }
  } catch (err) {
    console.error('DEBUG: Error in handleCanvasDrop:', err);
  }
}

/**
 * Adds a debug button to the UI for testing
 */
function addDebugButton() {
  const controlsSection = document.querySelector('.controls-section');
  if (controlsSection) {
    const debugBtn = document.createElement('button');
    debugBtn.id = 'debugBtn';
    debugBtn.textContent = 'Debug State';
    debugBtn.style.backgroundColor = '#ff5733';
    debugBtn.style.color = 'white';
    debugBtn.style.marginTop = '10px';

    debugBtn.addEventListener('click', () => {
      console.log('===== DEBUG STATE =====');
      debugUsedFiles();

      // Check for any inconsistencies
      console.log('DEBUG: Checking for inconsistencies...');

      // Find paths in usedFiles that don't have a corresponding character
      const orphanedPaths = Array.from(usedFiles).filter(path =>
        !characters.some(char => char.metadata && char.metadata.path === path)
      );

      if (orphanedPaths.length > 0) {
        console.log('DEBUG: Found orphaned paths in usedFiles:', orphanedPaths);
        console.log('DEBUG: Removing orphaned paths...');
        orphanedPaths.forEach(path => {
          usedFiles.delete(path);
          console.log(`DEBUG: Removed orphaned path: ${path}`);
          updateFileExplorerItem(path, false);
        });
      } else {
        console.log('DEBUG: No orphaned paths found');
      }

      // Re-populate the file explorer to ensure it's up to date
      console.log('DEBUG: Requesting workspace files refresh');
      vscode.postMessage({
        command: 'getWorkspaceFiles'
      });

      console.log('===== END DEBUG STATE =====');
    });

    controlsSection.appendChild(debugBtn);
    console.log('DEBUG: Debug button added to UI');
  }
}

// Call this function when the UI is initialized
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(addDebugButton, 1000); // Add with a delay to ensure the UI is fully loaded
});

/**
 * Debug function to log the state of usedFiles
 */
function debugUsedFiles() {
  console.log('DEBUG: Current usedFiles set:', Array.from(usedFiles));
  console.log('DEBUG: Number of items in usedFiles:', usedFiles.size);

  // Log each character with file/folder metadata
  console.log('DEBUG: Characters with metadata:');
  characters.forEach(char => {
    if (char.metadata) {
      console.log(`- ${char.metadata.name} (${char.metadata.type}): ${char.metadata.path}`);
    }
  });
}

// Export the events functions
window.events = {
  handleCanvasMouseDown,
  handleCanvasMouseMove,
  handleCanvasMouseUp,
  handleCanvasMouseLeave,
  handleCanvasClick,
  handleKeyDown,
  handleCanvasDragOver,
  handleCanvasDrop,
  debugUsedFiles
};

/**
 * Updates a file explorer item to show it as used or unused
 * @param {string} path - The path of the file to update
 * @param {boolean} isUsed - Whether the file is used (true) or unused (false)
 */
function updateFileExplorerItem(path, isUsed = true) {
  console.log(`DEBUG: updateFileExplorerItem called for path: ${path}, isUsed: ${isUsed}`);

  // Find the file element in the explorer
  const fileElement = document.querySelector(`.file-tree-item[data-path="${path}"]`);
  console.log(`DEBUG: fileElement found:`, fileElement ? true : false);

  if (fileElement) {
    const contentElement = fileElement.querySelector('.file-tree-content');
    console.log(`DEBUG: contentElement found:`, contentElement ? true : false);

    if (contentElement) {
      if (isUsed) {
        console.log(`DEBUG: Marking ${path} as USED`);

        // Add the used-file class
        contentElement.classList.add('used-file');
        console.log(`DEBUG: Added 'used-file' class:`, contentElement.classList.contains('used-file'));

        // Remove drag functionality
        contentElement.draggable = false;
        console.log(`DEBUG: Set draggable to false:`, contentElement.draggable);

        // Add click handler to flash the location on the canvas
        contentElement.addEventListener('click', () => {
          // Find the character on the canvas with this file path
          const character = characters.find(char =>
            char.metadata && char.metadata.path === path
          );

          if (character) {
            flashCharacterOnCanvas(character);
          }
        });
      } else {
        console.log(`DEBUG: Marking ${path} as UNUSED`);

        // Remove the used-file class
        contentElement.classList.remove('used-file');
        console.log(`DEBUG: Removed 'used-file' class:`, !contentElement.classList.contains('used-file'));

        // Restore drag functionality
        contentElement.draggable = true;
        console.log(`DEBUG: Set draggable to true:`, contentElement.draggable);

        // Remove click handlers (by cloning and replacing the element)
        const newContentElement = contentElement.cloneNode(true);

        // Add drag functionality to the new element
        newContentElement.draggable = true;
        newContentElement.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', JSON.stringify({
            path: path,
            name: fileElement.dataset.type === 'folder' ? fileElement.querySelector('.file-tree-name').textContent : fileElement.querySelector('.file-tree-name').textContent,
            type: fileElement.dataset.type
          }));
          newContentElement.classList.add('dragging');
          console.log(`DEBUG: Started dragging ${path}`);
        });

        newContentElement.addEventListener('dragend', () => {
          newContentElement.classList.remove('dragging');
          console.log(`DEBUG: Ended dragging ${path}`);
        });

        // Replace the old element with the new one
        contentElement.parentNode.replaceChild(newContentElement, contentElement);
        console.log(`DEBUG: Replaced element to remove click handlers and restore drag functionality`);

        // Verify the new element is draggable
        const updatedContentElement = fileElement.querySelector('.file-tree-content');
        console.log(`DEBUG: New element draggable:`, updatedContentElement.draggable);
      }

      // Log the current state of usedFiles
      debugUsedFiles();
    }
  } else {
    console.log(`DEBUG: Could not find file element for path: ${path}`);
  }
}
