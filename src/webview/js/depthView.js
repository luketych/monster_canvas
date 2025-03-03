// Initialize the VS Code API
const vscode = acquireVsCodeApi();

// State
let currentFileUri = null;
let currentFileDetails = null;
let children = [];

// Elements
const fileNameElement = document.getElementById('fileName');
const filePathElement = document.getElementById('filePath');
const fileDetailsElement = document.getElementById('fileDetails');
const depthContainerElement = document.getElementById('depthContainer');

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

// Function to get icon for file type
function getFileTypeIcon(type) {
    switch (type) {
        case 'directory':
            return '📁';
        case 'javascript':
            return '📄 JS';
        case 'typescript':
            return '📄 TS';
        case 'json':
            return '📄 JSON';
        case 'html':
            return '📄 HTML';
        case 'css':
            return '📄 CSS';
        case 'markdown':
            return '📄 MD';
        case 'python':
            return '📄 PY';
        case 'image':
            return '🖼️';
        default:
            return '📄';
    }
}

// Function to display file details
function displayFileDetails(details) {
    // Update state
    currentFileDetails = details;

    // Update file name and path
    fileNameElement.textContent = details.name;
    filePathElement.textContent = details.path;

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

// Function to display children
function displayChildren(childrenData) {
    // Update state
    children = childrenData;

    // Clear container
    depthContainerElement.innerHTML = '';

    // Display each child
    children.forEach(child => {
        const childElement = document.createElement('div');
        childElement.className = 'depth-item';
        childElement.dataset.uri = child.uri;

        // Type
        const typeElement = document.createElement('div');
        typeElement.className = 'depth-type';
        typeElement.textContent = getFileTypeIcon(child.type);
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

// Handle messages from the extension
window.addEventListener('message', event => {
    const message = event.data;

    switch (message.command) {
        case 'setCurrentFile':
            currentFileUri = message.fileUri;
            fileNameElement.textContent = message.fileName;
            break;

        case 'fileDetails':
            displayFileDetails(message.details);
            break;

        case 'children':
            // Check if this is a response to a folder expansion
            if (message.parentUri && message.parentUri !== currentFileUri) {
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
                        typeElement.textContent = getFileTypeIcon(child.type);
                        childElement.appendChild(typeElement);

                        // Name
                        const nameElement = document.createElement('div');
                        nameElement.className = 'depth-name';
                        nameElement.textContent = child.name;
                        childElement.appendChild(nameElement);

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
                displayChildren(message.children);
            }
            break;

        case 'clearChildren':
            depthContainerElement.innerHTML = '';
            break;

        case 'error':
            // Could show error message in UI if needed
            break;
    }
}); 