(function () {
    const vscode = acquireVsCodeApi();

    // State
    let currentFileUri = null;
    let currentFileDetails = null;
    let children = [];

    // Elements
    const fileNameElement = document.getElementById('fileName');
    const filePathElement = document.getElementById('filePath');
    const fileDetailsElement = document.getElementById('fileDetails');
    const childrenContainerElement = document.getElementById('childrenContainer');

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

    // Current view mode
    let currentViewMode = 'list';

    // Function to display children
    function displayChildren(childrenData, viewMode = currentViewMode) {
        // Update state
        children = childrenData;
        currentViewMode = viewMode;

        // Clear container
        childrenContainerElement.innerHTML = '';

        // Set view mode class
        childrenContainerElement.className = 'children-container ' + viewMode + '-view';

        // Handle different view modes
        switch (viewMode) {
            case 'list':
                displayListView(children);
                break;
            case 'icons':
                displayIconsView(children);
                break;
            case 'columns':
                displayColumnsView(children);
                break;
            case 'gallery':
                displayGalleryView(children);
                break;
            default:
                displayListView(children);
        }
    }

    // Function to display list view
    function displayListView(children) {
        children.forEach(child => {
            const childElement = document.createElement('div');
            childElement.className = 'child-item';
            childElement.dataset.uri = child.uri;

            // Icon
            const iconElement = document.createElement('div');
            iconElement.className = 'child-icon';
            iconElement.textContent = getFileTypeIcon(child.type);
            childElement.appendChild(iconElement);

            // Name
            const nameElement = document.createElement('div');
            nameElement.className = 'child-name';
            nameElement.textContent = child.name;
            childElement.appendChild(nameElement);

            // Cover
            const coverElement = document.createElement('div');
            coverElement.className = 'child-cover';
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
            stickersElement.className = 'child-stickers';
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

            childrenContainerElement.appendChild(childElement);
        });
    }

    // Function to display icons view
    function displayIconsView(children) {
        children.forEach(child => {
            const childElement = document.createElement('div');
            childElement.className = 'child-item';
            childElement.dataset.uri = child.uri;

            // Icon
            const iconElement = document.createElement('div');
            iconElement.className = 'child-icon';
            iconElement.textContent = getFileTypeIcon(child.type);
            childElement.appendChild(iconElement);

            // Name
            const nameElement = document.createElement('div');
            nameElement.className = 'child-name';
            nameElement.textContent = child.name;
            childElement.appendChild(nameElement);

            // Click handler
            if (child.isDirectory) {
                childElement.addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'getFileDetails',
                        fileUri: child.uri
                    });
                });
            } else {
                childElement.addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'openFile',
                        fileUri: child.uri
                    });
                });
            }

            childrenContainerElement.appendChild(childElement);
        });
    }

    // Function to display columns view
    function displayColumnsView(children) {
        // Create column
        const column = document.createElement('div');
        column.className = 'column';

        // Add column header
        const header = document.createElement('div');
        header.className = 'column-header';
        header.textContent = currentFileDetails ? currentFileDetails.name : 'Files';
        column.appendChild(header);

        // Add children
        children.forEach(child => {
            const childElement = document.createElement('div');
            childElement.className = 'child-item';
            childElement.dataset.uri = child.uri;

            // Icon
            const iconElement = document.createElement('div');
            iconElement.className = 'child-icon';
            iconElement.textContent = getFileTypeIcon(child.type);
            childElement.appendChild(iconElement);

            // Name
            const nameElement = document.createElement('div');
            nameElement.className = 'child-name';
            nameElement.textContent = child.name;
            childElement.appendChild(nameElement);

            // Click handler
            if (child.isDirectory) {
                childElement.addEventListener('click', () => {
                    // Remove any columns to the right
                    const columns = document.querySelectorAll('.column');
                    let foundCurrent = false;

                    columns.forEach(col => {
                        if (foundCurrent) {
                            col.remove();
                        }
                        if (col === column) {
                            foundCurrent = true;
                        }
                    });

                    // Request children
                    vscode.postMessage({
                        command: 'getChildren',
                        fileUri: child.uri
                    });
                });
            } else {
                childElement.addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'openFile',
                        fileUri: child.uri
                    });
                });
            }

            column.appendChild(childElement);
        });

        childrenContainerElement.appendChild(column);
    }

    // Function to display gallery view
    function displayGalleryView(children) {
        children.forEach(child => {
            const childElement = document.createElement('div');
            childElement.className = 'child-item';
            childElement.dataset.uri = child.uri;

            // Cover
            const coverElement = document.createElement('div');
            coverElement.className = 'child-cover';
            if (child.coverImage) {
                const imgElement = document.createElement('img');
                imgElement.src = child.coverImage;
                coverElement.appendChild(imgElement);
            } else {
                // If no cover, show icon
                coverElement.textContent = getFileTypeIcon(child.type);
                coverElement.style.fontSize = '32px';
            }
            childElement.appendChild(coverElement);

            // Info section (icon + name)
            const infoElement = document.createElement('div');
            infoElement.className = 'child-info';

            // Icon
            const iconElement = document.createElement('div');
            iconElement.className = 'child-icon';
            iconElement.textContent = getFileTypeIcon(child.type);
            infoElement.appendChild(iconElement);

            // Name
            const nameElement = document.createElement('div');
            nameElement.className = 'child-name';
            nameElement.textContent = child.name;
            infoElement.appendChild(nameElement);

            childElement.appendChild(infoElement);

            // Click handler
            if (child.isDirectory) {
                childElement.addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'getFileDetails',
                        fileUri: child.uri
                    });
                });
            } else {
                childElement.addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'openFile',
                        fileUri: child.uri
                    });
                });
            }

            childrenContainerElement.appendChild(childElement);
        });
    }

    // Function to display file comments
    function displayFileComments(comments, filePath) {
        // Clear container
        childrenContainerElement.innerHTML = '';

        // Create comments container
        const commentsContainer = document.createElement('div');
        commentsContainer.className = 'comments-container';

        // Add heading
        const heading = document.createElement('h3');
        heading.textContent = 'Comments from ' + path.basename(filePath);
        heading.style.marginBottom = '15px';
        commentsContainer.appendChild(heading);

        if (comments.length === 0) {
            // No comments found
            const noComments = document.createElement('p');
            noComments.textContent = 'No comments found in this file.';
            noComments.style.fontStyle = 'italic';
            noComments.style.color = 'var(--vscode-descriptionForeground)';
            commentsContainer.appendChild(noComments);
        } else {
            // Display each comment
            comments.forEach((comment, index) => {
                const commentElement = document.createElement('div');
                commentElement.className = 'comment';

                // Format the comment text
                const commentText = document.createElement('pre');
                commentText.textContent = comment;

                commentElement.appendChild(commentText);
                commentsContainer.appendChild(commentElement);
            });
        }

        childrenContainerElement.appendChild(commentsContainer);
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
        fileDetailsElement.innerHTML = '';
        childrenContainerElement.innerHTML = '';

        // Update title
        fileNameElement.textContent = 'No Workspace Open';
        filePathElement.textContent = '';

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

        childrenContainerElement.appendChild(messageElement);

        // Add click handler to browse button
        document.getElementById('browseButton').addEventListener('click', () => {
            vscode.postMessage({
                command: 'browseWorkspace'
            });
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
                // Set current view mode from details
                if (message.details.viewMode) {
                    currentViewMode = message.details.viewMode;
                }
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
                            childElement.className = 'child-item';
                            childElement.dataset.uri = child.uri;

                            // Icon
                            const iconElement = document.createElement('div');
                            iconElement.className = 'child-icon';
                            iconElement.textContent = getFileTypeIcon(child.type);
                            childElement.appendChild(iconElement);

                            // Name
                            const nameElement = document.createElement('div');
                            nameElement.className = 'child-name';
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
                    displayChildren(message.children, message.viewMode);
                }
                break;

            case 'clearChildren':
                childrenContainerElement.innerHTML = '';
                break;

            case 'fileComments':
                displayFileComments(message.comments, message.filePath);
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
    });

    // Handle view mode changes
    document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const newMode = e.target.value;
            currentViewMode = newMode;

            // Update container class
            childrenContainerElement.className = 'children-container ' + newMode + '-view';

            // Save view mode preference
            if (currentFileDetails && currentFileDetails.isDirectory) {
                const updatedDetails = { ...currentFileDetails, viewMode: newMode };
                vscode.postMessage({
                    command: 'saveFileDetails',
                    fileUri: currentFileUri,
                    details: updatedDetails
                });
            }

            // Redisplay children with new view mode
            displayChildren(children, newMode);
        });
    });

    // Initial request for file details if we have a URI
    if (currentFileUri) {
        vscode.postMessage({
            command: 'getFileDetails',
            fileUri: currentFileUri
        });
    }
})(); 