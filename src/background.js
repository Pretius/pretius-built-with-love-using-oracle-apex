import { detectApex, setActionIcon } from './lib/apex-detect.js';

async function refreshTab(tabId) {
  const { isApex } = await detectApex(tabId);
  await setActionIcon(tabId, isApex);
}

// Icons are set per tab, so Chrome handles tab switching and multiple windows.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    // Clear any stale red heart while the new page loads.
    setActionIcon(tabId, false);
  } else if (changeInfo.status === 'complete') {
    refreshTab(tabId);
  }
});

// Tabs opened before install/update never got a check; do them now.
chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id !== undefined) {
      refreshTab(tab.id);
    }
  }
});
