# Built with ❤️ using Oracle APEX

## Overview
**Built with ❤️ using Oracle APEX** is a Chrome extension that displays a red heart and additional information on webpages built with Oracle APEX. 

For pages not using Oracle APEX, it displays a heartbroken message.

## Features
- Detects if a webpage is built with Oracle APEX.
- Displays a red heart and information on Oracle APEX pages including the APEX version
- Shows the APEX version (e.g. `26.1`) on the toolbar icon
- Shows the Universal Theme version
- Detects APEX apps embedded in iframes
- Copy the page's APEX info as JSON or a Markdown table
- Share an APEX site on LinkedIn (only the site's address is shared, never the full URL, which can contain a session ID)
- **Hearts collected** (opt-in): counts the Oracle APEX sites you visit. Site names are encrypted (AES-GCM) and stored only on your device; private browsing is never recorded. Share your heart count on LinkedIn.
- Light and dark mode
- Available in English, Polish, Dutch, German, Spanish and French
- Shows a heartbroken emoji with a randomised sad message for non-Oracle APEX pages.

## Screenshots
![Oracle APEX Page](img/popup.png)

![Non-Oracle APEX Page](img/heartbroken.png)

## Installation
1. **Install from Chrome Web Store**:
   - Visit the [Chrome Web Store](https://chromewebstore.google.com/detail/built-with-love-using-ora/bhlkijnameeejlifhlmhcfjgmigdpjae) and click on "Add to Chrome".
   
2. **Pin to Taskbar**:
   - After installation, right-click on the extension icon in the Chrome toolbar.
   - Select "Pin" to keep it handy in your taskbar.

## Usage
1. Navigate to any webpage.
2. The extension icon will change based on whether the page is built with Oracle APEX:
   - Red heart icon for Oracle APEX pages.
   - Grey heart icon for non-Oracle APEX pages.
3. Click on the extension icon to see additional information on APEX pages

## Test it out 
- [Cards](https://apex.oracle.com/go/sample_cards)

- [Charts](https://apex.oracle.com/go/sample_charts)

- [Maps](https://apex.oracle.com/go/sample_maps)

- [PWA (Progressive Web App)](https://apex.oracle.com/go/pwa)

- [Universal Theme](https://apex.oracle.com/ut)

## Development

The extension lives in `src/` and has no build step. Load it in Chrome with **Load unpacked** on `chrome://extensions`, choosing the `src` folder.

```
npm ci
npm run lint
npm run check-locales
```

Translations are in `src/_locales/<lang>/messages.json`. `check-locales` fails if any language is missing a message that English has.

## Releasing

Releases publish automatically. Bump `version` in `src/manifest.json`, add a Release History entry, commit, then push a matching tag:

```
git tag v26.2.0
git push origin v26.2.0
```

The **Release** workflow then runs the checks, confirms the tag matches the manifest version, zips `src/`, uploads it to the Chrome Web Store, submits it for review, and creates a GitHub release with the zip attached.

### One-time setup (Chrome Web Store API v2)

Someone with access to the Pretius publisher account in the Chrome Web Store Developer Dashboard needs to:

1. In Google Cloud Console, enable the **Chrome Web Store API** and create an **OAuth client ID** (Web application, redirect URI `https://developers.google.com/oauthplayground`).
2. In the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground), use your own client ID and secret with scope `https://www.googleapis.com/auth/chromewebstore`, authorise, and exchange for a **refresh token**.
3. Find the **publisher ID** under Publisher > Settings in the Developer Dashboard.
4. Add these repository secrets in GitHub (Settings > Secrets and variables > Actions):
   - `CWS_CLIENT_ID`
   - `CWS_CLIENT_SECRET`
   - `CWS_REFRESH_TOKEN`
   - `CWS_PUBLISHER_ID`

The Google account needs 2-step verification. See [Use the Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api).

# Release History

26.2.0 : November 2026
* APEX version shown on the toolbar icon
* Universal Theme version shown in the popup
* Detects APEX apps embedded in iframes
* Copy APEX info as JSON or Markdown
* Share a site, or your heart count, on LinkedIn
* Hearts collected: opt-in, encrypted, on-device count of APEX sites visited
* Dark mode
* Translations: Polish, Dutch, German, Spanish, French
* Author and company links now go to LinkedIn
* Automated release to the Chrome Web Store on version tags
* Popup now checks the page when opened, so tabs open before install/update are detected
* Icon is set per tab (fixes wrong icon with multiple windows)
* Security: page-supplied values are rendered as text, never HTML
* Detection runs via `chrome.scripting` in the page's main world; no more content script, injected script, DOM attributes or web-accessible resources
* Removed unneeded `activeTab` permission; requires Chrome 102+
* Popup shows extension version; footer layout fixed

24.1.1 : July 2024
* Initial Version

## Built with ❤️ using Oracle APEX

- Author: [Matt Mulvaney](https://www.linkedin.com/in/matt-mulvaney-541a659/)

- Low-Code: [Pretius](https://www.linkedin.com/company/pretius)