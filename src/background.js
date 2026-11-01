import { detectApex, setActionState, NOT_APEX } from './lib/apex-detect.js';
import { recordHeart } from './lib/hearts.js';

async function refreshTab(tab) {
  const result = await detectApex(tab.id);
  await setActionState(tab.id, result);
  // Never record private browsing.
  if (result.isApex && !tab.incognito) {
    recordHeart(result.host).catch((error) => console.debug('Could not record heart:', error));
  }
}

// Icons and badges are set per tab, so Chrome handles tab switching and multiple windows.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    // Clear any stale red heart and version while the new page loads.
    setActionState(tabId, NOT_APEX);
  } else if (changeInfo.status === 'complete') {
    refreshTab(tab);
  }
});

// Tabs opened before install/update never got a check; do them now.
chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id !== undefined) {
      refreshTab(tab);
    }
  }
});
