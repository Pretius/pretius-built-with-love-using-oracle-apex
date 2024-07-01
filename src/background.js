// Error handling function
function errorHandling(msg, lastError) {
  // Suppress Chrome URLs eg. new tabs/extensions/settings
  if (!lastError.message.includes("chrome://")) {
    console.log(msg, lastError);
  }
}

// Function to execute the injected script in the specified tab
function executeInjectedScript(tabId) {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      func: (tabId) => {
        document.body.setAttribute('tmp_bwl_tabid', tabId);
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('scripts/injected-script.js');
        script.type = 'module';
        script.onload = () => script.remove();
        (document.head || document.documentElement).append(script);
      },
      args: [tabId]
    },
    () => {
      if (chrome.runtime.lastError) {
        errorHandling("Error executing script (load):", chrome.runtime.lastError);
      }
    }
  );
}

// Function to set the extension icon based on the APEX check result
function setIconBasedOnApexResult(result) {
  const iconPath = result ? "red_heart.png" : "grey_heart.png";
  chrome.action.setIcon({
    path: {
      "16": `icons/16_${iconPath}`,
      "32": `icons/32_${iconPath}`,
      "48": `icons/48_${iconPath}`,
      "128": `icons/128_${iconPath}`
    }
  });
}

// Function to check if the current page is an APEX page
function checkApexStatus(tabId) {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      func: () => document.body.getAttribute('tmp_bwl')
    },
    (results) => {
      if (chrome.runtime.lastError) {
        setIconBasedOnApexResult(false);
        errorHandling("Error executing script (change):", chrome.runtime.lastError);
        return;
      }

      try {
        const isApex = results &&
          results[0] &&
          results[0].result &&
          JSON.parse(results[0].result) &&
          Object.keys(JSON.parse(results[0].result)).length > 0 &&
          JSON.parse(results[0].result).isApex === true;
        setIconBasedOnApexResult(isApex);
      } catch (error) {
        console.log('Error handling response:', error);
      }
    }
  );
}

// Listener for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BUILT_WITH_LOVE_FROM_PAGE') {
    const payload = JSON.parse(message.payload);
    if (payload.isApex !== undefined) {

      // Check if the message originates from the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
          console.log('No active tabs found.');
          return;
        }
        const activeTabId = tabs[0].id;
        // Compare payload.tabId with the active tab ID
        if (payload.tabId === String(activeTabId)) {
          setIconBasedOnApexResult(payload.isApex);
        } else {
          checkApexStatus(activeTabId);
        }
      });
    }
  }

  if (message.type === 'GET_PAYLOAD') {
    chrome.scripting.executeScript(
      {
        target: { tabId: message.tabId },
        func: () => document.body.getAttribute('tmp_bwl')
      },
      (results) => {
        if (chrome.runtime.lastError) {
          errorHandling("Error executing script (getEnv):", chrome.runtime.lastError);
          sendResponse({ error: "Error executing script" });
        } else {
          const payload = JSON.parse(results[0].result);
          sendResponse({ payload: payload });
        }
      }
    );
    // Return true to indicate that sendResponse will be called asynchronously
    return true;
  }
});

// Listener for tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  checkApexStatus(activeInfo.tabId);
});

// Listener for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    executeInjectedScript(tabId);
  }
});
