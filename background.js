chrome.action.onClicked.addListener((tab) => {
  // Inject a script to capture the current page’s body content, current URL, and stylesheet links.
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: getPageContent
  }, (results) => {
    if (chrome.runtime.lastError || !results || results.length === 0) {
      console.error("Failed to capture page content.");
      return;
    }
    const pageContent = results[0].result;
    chrome.storage.local.set({
      capturedContent: pageContent.html,
      capturedBase: pageContent.base,
      capturedCss: pageContent.css
    }, () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("cleancapture.html") });
    });
  });
});

// This function is injected into the active page.
function getPageContent() {
  return {
    html: document.body.innerHTML,
    base: window.location.href,
    css: Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .map(link => link.outerHTML)
            .join('')
  };
}
