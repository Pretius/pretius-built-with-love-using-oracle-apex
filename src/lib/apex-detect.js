// Shared APEX detection, used by the background service worker and the popup.

export const NOT_APEX = Object.freeze({ isApex: false, env: {}, utVersion: '', host: '', inFrame: false });

const MAX_ENV_KEYS = 50;
const MAX_VALUE_LENGTH = 500;
const BADGE_COLOUR = '#1F90CB';

// Runs in the page's MAIN world (every frame) so it can see window.apex.
// Must be self-contained: Chrome serialises this function, so no closures.
function readApexEnv() {
  const env = {};
  let isApex = false;
  let utVersion = '';
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
    if (isApex) {
      // Universal Theme files live under .../themes/theme_42/<version>/
      for (const link of document.querySelectorAll('link[href*="/theme_42/"]')) {
        const match = /\/theme_42\/(\d+(?:\.\d+)+)\//.exec(link.getAttribute('href') || '');
        if (match) {
          utVersion = match[1];
          break;
        }
      }
    }
  } catch {
    // Page-controlled getters may throw; report what we have.
  }
  return { isApex: isApex, env: env, utVersion: utVersion, host: location.hostname };
}

function cleanString(value, pattern) {
  if (typeof value !== 'string') return '';
  const trimmed = value.slice(0, MAX_VALUE_LENGTH);
  return pattern && !pattern.test(trimmed) ? '' : trimmed;
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
  return {
    isApex: true,
    env,
    utVersion: cleanString(result.utVersion, /^\d+(\.\d+)+$/),
    host: cleanString(result.host, /^[a-z0-9.-]{1,253}$/i).toLowerCase(),
    inFrame: false
  };
}

// Checks the top page and every embedded frame. Prefers the top page when it
// is APEX itself; otherwise reports the first APEX frame found.
export async function detectApex(tabId) {
  try {
    const injections = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      world: 'MAIN',
      func: readApexEnv
    });
    const found = injections
      .map((injection) => ({ frameId: injection.frameId, result: normalise(injection.result) }))
      .filter((entry) => entry.result.isApex);
    if (found.length === 0) {
      return NOT_APEX;
    }
    const best = found.find((entry) => entry.frameId === 0) || found[0];
    return { ...best.result, inFrame: best.frameId !== 0 };
  } catch {
    // Restricted pages (chrome://, edge://, Web Store, PDF viewer, closed tabs)
    // cannot be scripted. That simply means "not APEX".
    return NOT_APEX;
  }
}

// "26.1.6" -> "26.1". Badges only fit about four characters.
export function badgeVersion(env) {
  const version = env.APEX_BASE_VERSION || env.APEX_VERSION || '';
  const match = /^(\d+\.\d+)/.exec(version);
  return match ? match[1] : '';
}

export async function setActionState(tabId, result) {
  const colour = result.isApex ? 'red' : 'grey';
  try {
    await chrome.action.setIcon({
      tabId,
      path: {
        16: `/icons/16_${colour}_heart.png`,
        32: `/icons/32_${colour}_heart.png`,
        48: `/icons/48_${colour}_heart.png`,
        128: `/icons/128_${colour}_heart.png`
      }
    });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOUR });
    await chrome.action.setBadgeText({ tabId, text: result.isApex ? badgeVersion(result.env) : '' });
  } catch {
    // Tab may have closed before the icon was set.
  }
}
