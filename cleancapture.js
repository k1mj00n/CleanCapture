// Wrap code in an IIFE for modularity and to avoid polluting the global scope.
(() => {
  /* =======================================
     Global Variables & Undo Stack
  ========================================== */
  let undoStack = [];
  let currentTarget = null;
  let originalContent = "";

  /* =======================================
     Utility: Force Layout Refresh
  ========================================== */
  function forceLayoutRefresh(callback) {
    // Accessing a layout property forces a reflow.
    void document.body.offsetHeight;
    setTimeout(callback, 100);
  }

  /* =======================================
     Initialization: Load Captured Content & Setup UI
  ========================================== */
  document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get(
      ["capturedContent", "capturedBase", "capturedCss"],
      (data) => {
        if (data.capturedContent) {
          // Inject external CSS captured from the original page.
          if (data.capturedCss) {
            const head = document.head;
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = data.capturedCss;
            Array.from(tempDiv.children).forEach((el) => {
              if (el.tagName.toLowerCase() === "link") {
                let href = el.getAttribute("href");
                if (
                  href &&
                  !href.startsWith("http") &&
                  !href.startsWith("data:") &&
                  !href.startsWith("//")
                ) {
                  try {
                    const absoluteUrl = new URL(href, data.capturedBase).href;
                    el.setAttribute("href", absoluteUrl);
                  } catch (e) {
                    console.error("Error converting CSS link href:", href, e);
                  }
                }
              }
              head.appendChild(el);
            });
          }
          const container = document.getElementById("contentContainer");
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = data.capturedContent;
          fixRelativeUrls(tempDiv, data.capturedBase);
          container.innerHTML = tempDiv.innerHTML;
          // Save the original captured layout for reset functionality.
          originalContent = container.innerHTML;
          addInteractiveListeners(container);
        } else {
          console.error("No captured content found.");
        }
      }
    );

    // Setup "Save as PDF" button with robust layout refresh.
    document.getElementById("savePdf").addEventListener("click", () => {
      forceLayoutRefresh(() => {
        window.print();
      });
    });

    // Setup Undo button.
    document.getElementById("undoAction").addEventListener("click", (e) => {
      e.preventDefault();
      undoLastAction();
    });

    // Setup Reset button.
    document.getElementById("resetAction").addEventListener("click", (e) => {
      e.preventDefault();
      resetLayout();
    });
  });

  /* =======================================
     Keyboard Shortcuts
  ========================================== */
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.preventDefault();
      undoLastAction();
    } else if (currentTarget) {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          moveElementVertical(currentTarget, -10);
          break;
        case "ArrowDown":
          e.preventDefault();
          moveElementVertical(currentTarget, 10);
          break;
        case "ArrowLeft":
          e.preventDefault();
          moveElement(currentTarget, -10);
          break;
        case "ArrowRight":
          e.preventDefault();
          moveElement(currentTarget, 10);
          break;
        case "Delete":
          e.preventDefault();
          deleteElement(currentTarget);
          removeControlPanel();
          break;
      }
    }
  });

  /* =======================================
     Utility: Fix Relative URLs
  ========================================== */
  function fixRelativeUrls(element, baseUrl) {
    const srcElements = element.querySelectorAll("[src]");
    srcElements.forEach((el) => {
      const src = el.getAttribute("src");
      if (
        src &&
        !src.startsWith("http") &&
        !src.startsWith("data:") &&
        !src.startsWith("//")
      ) {
        try {
          const absoluteUrl = new URL(src, baseUrl).href;
          el.setAttribute("src", absoluteUrl);
        } catch (e) {
          console.error("Error converting src to absolute URL:", src, e);
        }
      }
    });
    const hrefElements = element.querySelectorAll("[href]");
    hrefElements.forEach((el) => {
      const href = el.getAttribute("href");
      if (
        href &&
        !href.startsWith("http") &&
        !href.startsWith("data:") &&
        !href.startsWith("//") &&
        !href.startsWith("#")
      ) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          el.setAttribute("href", absoluteUrl);
        } catch (e) {
          console.error("Error converting href to absolute URL:", href, e);
        }
      }
    });
  }

  /* =======================================
     Interactive Listeners
  ========================================== */
  function addInteractiveListeners(container) {
    container.addEventListener("mouseover", (e) => {
      e.target.style.outline = "2px dashed red";
    });
    container.addEventListener("mouseout", (e) => {
      e.target.style.outline = "";
    });
    container.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.target !== container) {
          showControlPanel(e.target, e.pageX, e.pageY);
        }
      },
      true
    );
  }

  /* =======================================
     Undo Action Recording & Functions
  ========================================== */
  function pushUndoAction(action) {
    undoStack.push(action);
  }

  function moveElement(element, delta) {
    let prevLeft = element.style.left;
    let prevPosition = element.style.position;
    if (getComputedStyle(element).position === "static") {
      element.style.position = "relative";
    }
    pushUndoAction({
      type: "move",
      element: element,
      prevLeft: prevLeft,
      prevPosition: prevPosition
    });
    let currentLeft = parseInt(element.style.left) || 0;
    element.style.left = currentLeft + delta + "px";
  }

  function moveElementVertical(element, delta) {
    let prevTop = element.style.top;
    if (getComputedStyle(element).position === "static") {
      element.style.position = "relative";
    }
    pushUndoAction({
      type: "moveVertical",
      element: element,
      prevTop: prevTop
    });
    let currentTop = parseInt(element.style.top) || 0;
    element.style.top = currentTop + delta + "px";
  }

  function centerElement(element) {
    pushUndoAction({
      type: "center",
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
    element.style.display = "block";
    element.style.position = "relative";
    element.style.left = "";
    element.style.transform = "";
    element.style.marginLeft = "auto";
    element.style.marginRight = "auto";
  }

  function deleteElement(element) {
    pushUndoAction({
      type: "delete",
      element: element,
      parent: element.parentNode,
      nextSibling: element.nextSibling
    });
    element.remove();
  }

  function resetLayout() {
    const container = document.getElementById("contentContainer");
    container.innerHTML = originalContent;
    undoStack = [];
    addInteractiveListeners(container);
  }

  function undoLastAction() {
    if (undoStack.length === 0) return;
    const action = undoStack.pop();
    if (action.type === "move") {
      if (action.prevPosition !== undefined) {
        action.element.style.position = action.prevPosition;
      }
      if (action.prevLeft !== undefined) {
        action.element.style.left = action.prevLeft;
      }
    } else if (action.type === "moveVertical") {
      if (action.prevTop !== undefined) {
        action.element.style.top = action.prevTop;
      }
    } else if (action.type === "center" && action.prevStyles) {
      const s = action.prevStyles;
      action.element.style.display = s.display;
      action.element.style.position = s.position;
      action.element.style.top = s.top;
      action.element.style.left = s.left;
      action.element.style.transform = s.transform;
      action.element.style.marginLeft = s.marginLeft;
      action.element.style.marginRight = s.marginRight;
    } else if (action.type === "delete") {
      if (action.nextSibling) {
        action.parent.insertBefore(action.element, action.nextSibling);
      } else {
        action.parent.appendChild(action.element);
      }
    }
  }

  /* =======================================
     Control Panel Functions & Enhanced Positioning
  ========================================== */
  let currentControlPanel = null;

  function removeControlPanel() {
    if (currentControlPanel) {
      currentControlPanel.remove();
      currentControlPanel = null;
      currentTarget = null;
      document.removeEventListener("click", documentClickHandler);
    }
  }

  function showControlPanel(target, posX, posY) {
    removeControlPanel();
    currentTarget = target;
    const panel = document.createElement("div");
    panel.id = "controlPanel";
    panel.setAttribute("role", "toolbar");
    panel.setAttribute("aria-label", "Element control panel");
    
    // Default approximate dimensions.
    const panelWidth = 300;
    const panelHeight = 40;
    let adjustedX = posX;
    let adjustedY = posY;
    if (posX + panelWidth > window.innerWidth) {
      adjustedX = window.innerWidth - panelWidth - 10;
    }
    if (posY + panelHeight > window.innerHeight) {
      adjustedY = window.innerHeight - panelHeight - 10;
    }
    panel.style.position = "absolute";
    panel.style.top = adjustedY + "px";
    panel.style.left = adjustedX + "px";
    panel.style.backgroundColor = "rgba(255,255,255,0.9)";
    panel.style.border = "1px solid #ccc";
    panel.style.padding = "5px";
    panel.style.zIndex = 10000;
    panel.style.display = "flex";
    panel.style.gap = "5px";

    // Helper to create accessible buttons.
    const createButton = (text, ariaLabel, onClick) => {
      const btn = document.createElement("button");
      btn.textContent = text;
      btn.setAttribute("aria-label", ariaLabel);
      btn.addEventListener("click", onClick);
      return btn;
    };

    const upBtn = createButton("↑", "Move element up", (e) => {
      e.stopPropagation();
      moveElementVertical(target, -10);
    });
    const leftBtn = createButton("←", "Move element left", (e) => {
      e.stopPropagation();
      moveElement(target, -10);
    });
    const rightBtn = createButton("→", "Move element right", (e) => {
      e.stopPropagation();
      moveElement(target, 10);
    });
    const downBtn = createButton("↓", "Move element down", (e) => {
      e.stopPropagation();
      moveElementVertical(target, 10);
    });
    const centerBtn = createButton("Center", "Center align element", (e) => {
      e.stopPropagation();
      centerElement(target);
    });
    const deleteBtn = createButton("Delete", "Delete element", (e) => {
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
      document.addEventListener("click", documentClickHandler);
    }, 0);
  }

  function documentClickHandler(e) {
    if (currentControlPanel && !currentControlPanel.contains(e.target)) {
      removeControlPanel();
    }
  }
})();
