chrome.action.onClicked.addListener((tab) => {
  // Inject a script that returns the body HTML, current URL and CSS links.
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: getPageContent
  }, (results) => {
    if (chrome.runtime.lastError || !results || results.length === 0) {
      console.error("Failed to capture page content.");
      return;
    }
    const pageContent = results[0].result;
    // Save captured body HTML, base URL and CSS links into storage.
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
