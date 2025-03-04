// Global undo stack to record changes.
let undoStack = [];
// Global variable for the currently selected element.
let currentTarget = null;

document.addEventListener('DOMContentLoaded', () => {
  // Retrieve captured HTML, base URL and CSS links.
  chrome.storage.local.get(
    ['capturedContent', 'capturedBase', 'capturedCss'],
    (data) => {
      if (data.capturedContent) {
        // Inject captured CSS into the document head.
        if (data.capturedCss) {
          const head = document.head;
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = data.capturedCss;
          Array.from(tempDiv.children).forEach((el) => {
            if (el.tagName.toLowerCase() === 'link') {
              let href = el.getAttribute('href');
              if (href && !href.startsWith('http') && !href.startsWith('data:') && !href.startsWith('//')) {
                try {
                  const absoluteUrl = new URL(href, data.capturedBase).href;
                  el.setAttribute('href', absoluteUrl);
                } catch (e) {
                  console.error('Error converting CSS link href:', href, e);
                }
              }
            }
            head.appendChild(el);
          });
        }

        const container = document.getElementById('contentContainer');
        // Create a temporary div to process captured HTML.
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = data.capturedContent;
        fixRelativeUrls(tempDiv, data.capturedBase);
        container.innerHTML = tempDiv.innerHTML;
        addInteractiveListeners(container);
      } else {
        console.error('No captured content found.');
      }
    }
  );

  // Save as PDF button.
  document.getElementById('savePdf').addEventListener('click', () => {
    window.print();
  });

  // Undo button.
  document.getElementById('undoAction').addEventListener('click', (e) => {
    e.preventDefault();
    undoLastAction();
  });
});

// Keyboard shortcuts.
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    undoLastAction();
  } else if (currentTarget) {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        moveElementVertical(currentTarget, -10);
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveElementVertical(currentTarget, 10);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveElement(currentTarget, -10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveElement(currentTarget, 10);
        break;
      case 'Delete':
        e.preventDefault();
        deleteElement(currentTarget);
        removeControlPanel();
        break;
    }
  }
});

// Fix relative URLs for elements with src or href.
function fixRelativeUrls(element, baseUrl) {
  const srcElements = element.querySelectorAll('[src]');
  srcElements.forEach((el) => {
    const src = el.getAttribute('src');
    if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('//')) {
      try {
        const absoluteUrl = new URL(src, baseUrl).href;
        el.setAttribute('src', absoluteUrl);
      } catch (e) {
        console.error('Error converting src to absolute URL:', src, e);
      }
    }
  });

  const hrefElements = element.querySelectorAll('[href]');
  hrefElements.forEach((el) => {
    const href = el.getAttribute('href');
    if (href && !href.startsWith('http') && !href.startsWith('data:') && !href.startsWith('//') && !href.startsWith('#')) {
      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        el.setAttribute('href', absoluteUrl);
      } catch (e) {
        console.error('Error converting href to absolute URL:', href, e);
      }
    }
  });
}

// Add interactive listeners to container elements.
function addInteractiveListeners(container) {
  container.addEventListener('mouseover', (e) => {
    e.target.style.outline = '2px dashed red';
  });
  container.addEventListener('mouseout', (e) => {
    e.target.style.outline = '';
  });
  container.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target !== container) {
      showControlPanel(e.target, e.pageX, e.pageY);
    }
  }, true);
}

// Record an undo action.
function pushUndoAction(action) {
  undoStack.push(action);
}

// Horizontal movement.
function moveElement(element, delta) {
  let prevLeft = element.style.left;
  let prevPosition = element.style.position;
  if (getComputedStyle(element).position === 'static') {
    element.style.position = 'relative';
  }
  pushUndoAction({
    type: 'move',
    element: element,
    prevLeft: prevLeft,
    prevPosition: prevPosition
  });
  let currentLeft = parseInt(element.style.left) || 0;
  element.style.left = currentLeft + delta + 'px';
}

// Vertical movement.
function moveElementVertical(element, delta) {
  let prevTop = element.style.top;
  if (getComputedStyle(element).position === 'static') {
    element.style.position = 'relative';
  }
  pushUndoAction({
    type: 'moveVertical',
    element: element,
    prevTop: prevTop
  });
  let currentTop = parseInt(element.style.top) || 0;
  element.style.top = currentTop + delta + 'px';
}

// Center element horizontally (using relative positioning so it remains in flow).
function centerElement(element) {
  pushUndoAction({
    type: 'center',
    element: element,
    prevStyles: {
      display: element.style.display,
      position: element.style.position,
      top: element.style.top,
      left: element.style.left,
      transform: element.style.transform,
      marginLeft: element.style.marginLeft,
      marginRight: element.style.marginRight
    }
  });
  element.style.display = 'block';
  element.style.position = 'relative';
  element.style.left = '';
  element.style.transform = '';
  element.style.marginLeft = 'auto';
  element.style.marginRight = 'auto';
}

// Delete an element.
function deleteElement(element) {
  pushUndoAction({
    type: 'delete',
    element: element,
    parent: element.parentNode,
    nextSibling: element.nextSibling
  });
  element.remove();
}

// --- Control Panel Functions ---
let currentControlPanel = null;

function removeControlPanel() {
  if (currentControlPanel) {
    currentControlPanel.remove();
    currentControlPanel = null;
    currentTarget = null;
    document.removeEventListener('click', documentClickHandler);
  }
}

function showControlPanel(target, posX, posY) {
  removeControlPanel();
  currentTarget = target; // Store the element for keyboard controls.

  const panel = document.createElement('div');
  panel.id = 'controlPanel';
  panel.style.position = 'absolute';
  panel.style.top = posY + 'px';
  panel.style.left = posX + 'px';
  panel.style.backgroundColor = 'rgba(255,255,255,0.9)';
  panel.style.border = '1px solid #ccc';
  panel.style.padding = '5px';
  panel.style.zIndex = 10000;
  panel.style.display = 'flex';
  panel.style.gap = '5px';

  // Up button.
  const upBtn = document.createElement('button');
  upBtn.textContent = '↑';
  upBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    moveElementVertical(target, -10);
  });

  // Left button.
  const leftBtn = document.createElement('button');
  leftBtn.textContent = '←';
  leftBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    moveElement(target, -10);
  });

  // Right button.
  const rightBtn = document.createElement('button');
  rightBtn.textContent = '→';
  rightBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    moveElement(target, 10);
  });

  // Down button.
  const downBtn = document.createElement('button');
  downBtn.textContent = '↓';
  downBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    moveElementVertical(target, 10);
  });

  // Center button.
  const centerBtn = document.createElement('button');
  centerBtn.textContent = 'Center';
  centerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    centerElement(target);
  });

  // Delete button.
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteElement(target);
    removeControlPanel();
  });

  panel.appendChild(upBtn);
  panel.appendChild(leftBtn);
  panel.appendChild(rightBtn);
  panel.appendChild(downBtn);
  panel.appendChild(centerBtn);
  panel.appendChild(deleteBtn);

  document.body.appendChild(panel);
  currentControlPanel = panel;

  setTimeout(() => {
    document.addEventListener('click', documentClickHandler);
  }, 0);
}

function documentClickHandler(e) {
  if (currentControlPanel && !currentControlPanel.contains(e.target)) {
    removeControlPanel();
  }
}

// --- Undo Function ---
function undoLastAction() {
  if (undoStack.length === 0) return;
  const action = undoStack.pop();
  if (action.type === 'move') {
    if (action.prevPosition !== undefined) {
      action.element.style.position = action.prevPosition;
    }
    if (action.prevLeft !== undefined) {
      action.element.style.left = action.prevLeft;
    }
  } else if (action.type === 'moveVertical') {
    if (action.prevTop !== undefined) {
      action.element.style.top = action.prevTop;
    }
  } else if (action.type === 'center' && action.prevStyles) {
    const s = action.prevStyles;
    action.element.style.display = s.display;
    action.element.style.position = s.position;
    action.element.style.top = s.top;
    action.element.style.left = s.left;
    action.element.style.transform = s.transform;
    action.element.style.marginLeft = s.marginLeft;
    action.element.style.marginRight = s.marginRight;
  } else if (action.type === 'delete') {
    if (action.nextSibling) {
      action.parent.insertBefore(action.element, action.nextSibling);
    } else {
      action.parent.appendChild(action.element);
    }
  }
}
