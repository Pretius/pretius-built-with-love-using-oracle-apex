// Shared APEX detection, used by the background service worker and the popup.

const NOT_APEX = Object.freeze({ isApex: false, env: {} });
const MAX_ENV_KEYS = 50;
const MAX_VALUE_LENGTH = 500;

// Runs in the page's MAIN world so it can see window.apex.
// Must be self-contained: Chrome serialises this function, so no closures.
function readApexEnv() {
  const env = {};
  let isApex = false;
  try {
    isApex = typeof (window.apex && window.apex.jQuery) === 'function';
    const source = isApex ? window.apex.env : null;
    if (source && typeof source === 'object') {
      for (const key of Object.keys(source).slice(0, 50)) {
        const value = source[key];
        const type = typeof value;
        if (type === 'string' || type === 'number' || type === 'boolean') {
          env[key] = String(value);
        }
      }
    }
  } catch (e) {
    // Page-controlled getters may throw; report what we have.
  }
  return { isApex: isApex, env: env };
}

// The page can tamper with globals in the MAIN world, so re-validate here.
function normalise(result) {
  if (!result || typeof result !== 'object' || result.isApex !== true) {
    return NOT_APEX;
  }
  const env = {};
  const source = result.env && typeof result.env === 'object' ? result.env : {};
  for (const key of Object.keys(source).slice(0, MAX_ENV_KEYS)) {
    const value = source[key];
    if (typeof value === 'string') {
      env[String(key).slice(0, MAX_VALUE_LENGTH)] = value.slice(0, MAX_VALUE_LENGTH);
    }
  }
  return { isApex: true, env };
}

export async function detectApex(tabId) {
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: readApexEnv
    });
    return normalise(injection && injection.result);
  } catch (error) {
    // Restricted pages (chrome://, edge://, Web Store, PDF viewer, closed tabs)
    // cannot be scripted. That simply means "not APEX".
    return NOT_APEX;
  }
}

export function setActionIcon(tabId, isApex) {
  const colour = isApex ? 'red' : 'grey';
  return chrome.action.setIcon({
    tabId,
    path: {
      16: `/icons/16_${colour}_heart.png`,
      32: `/icons/32_${colour}_heart.png`,
      48: `/icons/48_${colour}_heart.png`,
      128: `/icons/128_${colour}_heart.png`
    }
  }).catch(() => {
    // Tab may have closed before the icon was set.
  });
}
