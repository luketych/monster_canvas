(function () {
  const vscode = acquireVsCodeApi();

  // State
  let currentFileUri = null;
  let currentFileDetails = null;
  let children = [];
  let settings = {
    maxHeight: 200,
    showStickers: true,
    showCover: true
  };
  let domInitialized = false;
  let pendingMessages = [];

  // Check if we're in sidebar mode
  const isSidebarMode = document.body.getAttribute('data-view-mode') === 'sidebar';

  // Set an appropriate height for depth items based on mode
  document.documentElement.style.setProperty('--depth-item-height',
    isSidebarMode ? '150px' : '200px');

  // Elements
  const fileNameElement = document.getElementById('fileName');
  const filePathElement = document.getElementById('filePath');
  const fileDetailsElement = document.getElementById('fileDetails');
  const depthContainerElement = document.getElementById('depthContainer');
  const maxHeightInput = document.getElementById('maxHeight');
  const showStickersCheckbox = document.getElementById('showStickers');
  const showCoverCheckbox = document.getElementById('showCover');

  // Settings handlers
  maxHeightInput?.addEventListener('change', (e) => {
    settings.maxHeight = parseInt(e.target.value);
    updateSettings();
    refreshDisplay();
  });

  showStickersCheckbox?.addEventListener('change', (e) => {
    settings.showStickers = e.target.checked;
    updateSettings();
    refreshDisplay();
  });

  showCoverCheckbox?.addEventListener('change', (e) => {
    settings.showCover = e.target.checked;
    updateSettings();
    refreshDisplay();
  });

  function updateSettings() {
    vscode.postMessage({
      command: 'updateSettings',
      settings
    });
  }

  function refreshDisplay() {
    if (children.length > 0) {
      displayDepthView(children);
    }
  }

  // Function to format file size
  function formatFileSize(size) {
    if (size < 1024) {
      return size + ' B';
    } else if (size < 1024 * 1024) {
      return (size / 1024).toFixed(2) + ' KB';
    } else if (size < 1024 * 1024 * 1024) {
      return (size / (1024 * 1024)).toFixed(2) + ' MB';
    } else {
      return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
  }

  // Function to format date
  function formatDate(date) {
    return new Date(date).toLocaleString();
  }

  // Function to get file type label
  function getFileTypeLabel(type) {
    switch (type) {
      case 'directory':
        return 'Folder';
      case 'javascript':
        return 'JS';
      case 'typescript':
        return 'TS';
      case 'json':
        return 'JSON';
      case 'html':
        return 'HTML';
      case 'css':
        return 'CSS';
      case 'markdown':
        return 'MD';
      case 'python':
        return 'PY';
      case 'image':
        return 'Image';
      default:
        return 'File';
    }
  }

  // Function to display file details
  function displayFileDetails(details) {
    if (!fileDetailsElement) return;

    // Update state
    currentFileDetails = details;

    // Update file name and path
    if (fileNameElement) fileNameElement.textContent = details.name;
    if (filePathElement) filePathElement.textContent = details.path;

    // Update file details
    fileDetailsElement.innerHTML = '';

    // Type
    const typeItem = document.createElement('div');
    typeItem.className = 'detail-item';

    const typeLabel = document.createElement('div');
    typeLabel.className = 'detail-label';
    typeLabel.textContent = 'Type';
    typeItem.appendChild(typeLabel);

    const typeValue = document.createElement('div');
    typeValue.className = 'detail-value';
    typeValue.textContent = details.type;
    typeItem.appendChild(typeValue);

    fileDetailsElement.appendChild(typeItem);

    // Size (if not a directory)
    if (!details.isDirectory) {
      const sizeItem = document.createElement('div');
      sizeItem.className = 'detail-item';

      const sizeLabel = document.createElement('div');
      sizeLabel.className = 'detail-label';
      sizeLabel.textContent = 'Size';
      sizeItem.appendChild(sizeLabel);

      const sizeValue = document.createElement('div');
      sizeValue.className = 'detail-value';
      sizeValue.textContent = formatFileSize(details.size);
      sizeItem.appendChild(sizeValue);

      fileDetailsElement.appendChild(sizeItem);
    }

    // Created
    const createdItem = document.createElement('div');
    createdItem.className = 'detail-item';

    const createdLabel = document.createElement('div');
    createdLabel.className = 'detail-label';
    createdLabel.textContent = 'Created';
    createdItem.appendChild(createdLabel);

    const createdValue = document.createElement('div');
    createdValue.className = 'detail-value';
    createdValue.textContent = formatDate(details.created);
    createdItem.appendChild(createdValue);

    fileDetailsElement.appendChild(createdItem);

    // Modified
    const modifiedItem = document.createElement('div');
    modifiedItem.className = 'detail-item';

    const modifiedLabel = document.createElement('div');
    modifiedLabel.className = 'detail-label';
    modifiedLabel.textContent = 'Modified';
    modifiedItem.appendChild(modifiedLabel);

    const modifiedValue = document.createElement('div');
    modifiedValue.className = 'detail-value';
    modifiedValue.textContent = formatDate(details.modified);
    modifiedItem.appendChild(modifiedValue);

    fileDetailsElement.appendChild(modifiedItem);
  }

  // Function to display children in depth view
  function displayDepthView(children) {
    if (!depthContainerElement) return;

    // Clear container
    depthContainerElement.innerHTML = '';

    // Set CSS variable for max height
    document.documentElement.style.setProperty('--depth-item-height', `${settings.maxHeight}px`);

    children.forEach(child => {
      const childElement = document.createElement('div');
      childElement.className = 'depth-item';
      childElement.dataset.uri = child.uri;

      // Type
      const typeElement = document.createElement('div');
      typeElement.className = 'depth-type';
      typeElement.textContent = getFileTypeLabel(child.type);
      childElement.appendChild(typeElement);

      // Name
      const nameElement = document.createElement('div');
      nameElement.className = 'depth-name';
      nameElement.textContent = child.name;
      childElement.appendChild(nameElement);

      // Cover Image
      if (settings.showCover && child.coverImage) {
        const coverElement = document.createElement('div');
        coverElement.className = 'depth-cover';
        const coverImg = document.createElement('img');
        coverImg.src = child.coverImage;
        coverImg.alt = 'Cover';
        coverElement.appendChild(coverImg);
        childElement.appendChild(coverElement);
      }

      // Stickers
      if (settings.showStickers && child.stickers && child.stickers.length > 0) {
        const stickersElement = document.createElement('div');
        stickersElement.className = 'depth-stickers';
        child.stickers.forEach(stickerUri => {
          const stickerImg = document.createElement('img');
          stickerImg.src = stickerUri;
          stickerImg.alt = 'Sticker';
          stickersElement.appendChild(stickerImg);
        });
        childElement.appendChild(stickersElement);
      }

      // Click handler for folders (accordion behavior)
      if (child.isDirectory) {
        childElement.addEventListener('click', (e) => {
          e.stopPropagation();

          // Check if folder children already exist
          const existingChildren = document.querySelector('.folder-children[data-parent="' + child.uri + '"]');

          if (existingChildren) {
            // Toggle expanded state
            existingChildren.classList.toggle('expanded');
          } else {
            // Create folder children container
            const folderChildren = document.createElement('div');
            folderChildren.className = 'folder-children expanded';
            folderChildren.dataset.parent = child.uri;

            // Add loading indicator
            const loadingElement = document.createElement('div');
            loadingElement.textContent = 'Loading...';
            folderChildren.appendChild(loadingElement);

            // Insert after the current child
            childElement.parentNode.insertBefore(folderChildren, childElement.nextSibling);

            // Request children
            vscode.postMessage({
              command: 'getChildren',
              fileUri: child.uri
            });
          }
        });
      } else {
        // Click handler for files
        childElement.addEventListener('click', () => {
          vscode.postMessage({
            command: 'openFile',
            fileUri: child.uri
          });
        });
      }

      depthContainerElement.appendChild(childElement);
    });
  }

  // Function to show error
  function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;

    // Add to body
    document.body.appendChild(errorElement);

    // Remove after 5 seconds
    setTimeout(() => {
      errorElement.remove();
    }, 5000);
  }

  // Function to show no workspace message
  function showNoWorkspaceMessage() {
    // Clear containers
    if (fileDetailsElement) fileDetailsElement.innerHTML = '';
    if (depthContainerElement) depthContainerElement.innerHTML = '';

    // Update title
    if (fileNameElement) fileNameElement.textContent = 'No Workspace Open';
    if (filePathElement) filePathElement.textContent = '';

    // Create message
    const messageElement = document.createElement('div');
    messageElement.style.textAlign = 'center';
    messageElement.style.padding = '20px';
    messageElement.style.marginTop = '50px';

    // Create message paragraph
    const p1 = document.createElement('p');
    p1.textContent = 'No workspace is currently open.';
    messageElement.appendChild(p1);

    const p2 = document.createElement('p');
    p2.textContent = 'Please open a folder or browse for a file to view details.';
    messageElement.appendChild(p2);

    // Create browse button
    const browseButton = document.createElement('button');
    browseButton.id = 'browseButton';
    browseButton.textContent = 'Browse...';
    browseButton.style.marginTop = '20px';
    browseButton.style.padding = '8px 16px';
    messageElement.appendChild(browseButton);

    if (depthContainerElement) {
      depthContainerElement.appendChild(messageElement);

      // Add click handler to browse button
      const button = document.getElementById('browseButton');
      if (button) {
        button.addEventListener('click', () => {
          vscode.postMessage({
            command: 'browseWorkspace'
          });
        });
      }
    }
  }

  // Function to initialize DOM elements and process any pending messages
  function initializeDom() {
    if (domInitialized) return;

    // Check if all required DOM elements are available
    if (fileNameElement && filePathElement && fileDetailsElement && depthContainerElement) {
      domInitialized = true;

      // Process any pending messages
      while (pendingMessages.length > 0) {
        processMessage(pendingMessages.shift());
      }
    }
  }

  // Process a message
  function processMessage(message) {
    if (!domInitialized) {
      // Queue message for later processing
      pendingMessages.push(message);
      return;
    }

    switch (message.command) {
      case 'setCurrentFile':
        currentFileUri = message.fileUri;
        if (fileNameElement) fileNameElement.textContent = message.fileName;
        if (filePathElement) filePathElement.textContent = message.fileUri;
        break;

      case 'fileDetails':
        currentFileDetails = message.details;
        displayFileDetails(message.details);
        break;

      case 'children':
        if (message.parentUri) {
          // Find the folder children container
          const folderChildren = document.querySelector('.folder-children[data-parent="' + message.parentUri + '"]');
          if (folderChildren) {
            // Clear loading indicator
            folderChildren.innerHTML = '';
            // Display children in the folder container
            message.children.forEach(child => {
              const childElement = document.createElement('div');
              childElement.className = 'depth-item';
              childElement.dataset.uri = child.uri;

              // Type
              const typeElement = document.createElement('div');
              typeElement.className = 'depth-type';
              typeElement.textContent = getFileTypeLabel(child.type);
              childElement.appendChild(typeElement);

              // Name
              const nameElement = document.createElement('div');
              nameElement.className = 'depth-name';
              nameElement.textContent = child.name;
              childElement.appendChild(nameElement);

              // Cover
              const coverElement = document.createElement('div');
              coverElement.className = 'depth-cover';
              if (child.coverImage) {
                const imgElement = document.createElement('img');
                imgElement.src = child.coverImage;
                coverElement.appendChild(imgElement);
              } else {
                coverElement.textContent = 'No cover';
              }

              // Add click handler for cover image
              coverElement.addEventListener('click', (e) => {
                e.stopPropagation();
                // Send message to select cover image
                vscode.postMessage({
                  command: 'selectCoverImage',
                  fileUri: child.uri
                });
              });

              childElement.appendChild(coverElement);

              // Stickers
              const stickersElement = document.createElement('div');
              stickersElement.className = 'depth-stickers';
              if (child.stickers && child.stickers.length > 0) {
                child.stickers.forEach(sticker => {
                  const stickerElement = document.createElement('div');
                  stickerElement.className = 'sticker';

                  // If sticker is a path to an image
                  if (typeof sticker === 'string' && (sticker.endsWith('.png') || sticker.endsWith('.jpg') || sticker.endsWith('.jpeg') || sticker.endsWith('.gif'))) {
                    const imgElement = document.createElement('img');
                    imgElement.src = sticker;
                    stickerElement.appendChild(imgElement);
                  } else {
                    stickerElement.textContent = sticker;
                  }

                  stickersElement.appendChild(stickerElement);
                });
              }

              // Add click handler for stickers
              stickersElement.addEventListener('click', (e) => {
                e.stopPropagation();
                // Send message to select stickers
                vscode.postMessage({
                  command: 'selectStickers',
                  fileUri: child.uri
                });
              });

              childElement.appendChild(stickersElement);

              // Click handler
              if (child.isDirectory) {
                childElement.addEventListener('click', (e) => {
                  e.stopPropagation();

                  // Check if folder children already exist
                  const existingChildren = document.querySelector('.folder-children[data-parent="' + child.uri + '"]');

                  if (existingChildren) {
                    // Toggle expanded state
                    existingChildren.classList.toggle('expanded');
                  } else {
                    // Create folder children container
                    const nestedFolderChildren = document.createElement('div');
                    nestedFolderChildren.className = 'folder-children expanded';
                    nestedFolderChildren.dataset.parent = child.uri;

                    // Add loading indicator
                    const loadingElement = document.createElement('div');
                    loadingElement.textContent = 'Loading...';
                    nestedFolderChildren.appendChild(loadingElement);

                    // Insert after the current child
                    childElement.parentNode.insertBefore(nestedFolderChildren, childElement.nextSibling);

                    // Request children
                    vscode.postMessage({
                      command: 'getChildren',
                      fileUri: child.uri
                    });
                  }
                });
              } else {
                childElement.addEventListener('click', (e) => {
                  e.stopPropagation();
                  vscode.postMessage({
                    command: 'openFile',
                    fileUri: child.uri
                  });
                });
              }

              folderChildren.appendChild(childElement);
            });
          }
        } else {
          // Display children in the main container
          children = message.children;
          displayDepthView(children);
        }
        break;

      case 'clearChildren':
        if (depthContainerElement) depthContainerElement.innerHTML = '';
        break;

      case 'error':
        showError(message.message);
        break;

      case 'noWorkspace':
        showNoWorkspaceMessage();
        break;

      case 'detailsSaved':
        // Could show a notification or update UI if needed
        break;
    }
  }

  // Handle messages from the extension
  window.addEventListener('message', event => {
    processMessage(event.data);
  });

  // Ensure DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDom);
  } else {
    initializeDom();
  }

  // Initial request for file details if we have a URI
  if (currentFileUri) {
    vscode.postMessage({
      command: 'getFileDetails',
      fileUri: currentFileUri
    });
  }
})();
