import { detectApex, setActionIcon } from '../lib/apex-detect.js';

const APEX_URL = 'https://apex.oracle.com/';
const APEX_TOKEN = '{apex}';

const HEARTBROKEN_MESSAGES = [
  `No love for ${APEX_TOKEN} here 💔`,
  `Heartbroken without ${APEX_TOKEN} 💔`,
  `${APEX_TOKEN} is missing, and so is the love 💔`,
  `No ${APEX_TOKEN}, just heartache 💔`,
  `Feeling the void of ${APEX_TOKEN} 💔`,
  `${APEX_TOKEN} not found, only heartbreak 💔`,
  `Lost without ${APEX_TOKEN} 💔`,
  `${APEX_TOKEN} skipped, hearts broken 💔`,
  `No ${APEX_TOKEN}, no love 💔`,
  `Unbelievable, no ${APEX_TOKEN} 💔`,
  `Without ${APEX_TOKEN}, it's just 💔`,
  `No ${APEX_TOKEN}, son's crying now, cheers 💔`
];

document.addEventListener('DOMContentLoaded', initializePopup);

async function initializePopup() {
  const content = document.getElementById('content');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Detect on open, so tabs loaded before install/update are still correct.
  const result = tab && tab.id !== undefined
    ? await detectApex(tab.id)
    : { isApex: false, env: {} };

  if (tab && tab.id !== undefined) {
    setActionIcon(tab.id, result.isApex);
  }

  const body = el('div', 'popup-content-body');
  if (result.isApex) {
    body.append(heading('Built with ❤️ using {apex}'));
    if (Object.keys(result.env).length > 0) {
      body.append(envTable(result.env));
    }
    content.replaceChildren(body, footer());
  } else {
    const message = HEARTBROKEN_MESSAGES[Math.floor(Math.random() * HEARTBROKEN_MESSAGES.length)];
    body.append(heading(message));
    content.replaceChildren(body);
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function link(href, text, className) {
  const a = el('a', className, text);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

// Builds an <h3>, replacing {apex} with an Oracle APEX link.
function heading(template) {
  const h3 = el('h3');
  const [before, after = ''] = template.split(APEX_TOKEN);
  h3.append(before, link(APEX_URL, 'Oracle APEX', 'pretiusHiddenLink'), after);
  return h3;
}

// Page-supplied values: textContent only, never innerHTML.
function envTable(env) {
  const table = el('table', 'blue-theme');
  const headRow = el('tr');
  headRow.append(el('th', null, 'Attribute'), el('th', null, 'Value'));
  table.append(headRow);

  for (const [key, value] of Object.entries(env)) {
    const row = el('tr');
    row.append(el('td', null, key), el('td', null, value));
    table.append(row);
  }
  return table;
}

function footer() {
  const div = el('div', 'pretiusRevealerFooter');
  const social = el('div', 'pretiusSocial');
  social.append(
    link('https://www.linkedin.com/in/matt-mulvaney-541a659/', 'Matt Mulvaney', 'pretiusRevealerLink'),
    link('https://www.linkedin.com/company/pretius', 'Pretius', 'pretiusRevealerLink')
  );
  div.append(
    link('https://pretius.com/main/', 'pretius.com', 'pretiusRevealerLink pretiusSite'),
    social,
    el('span', 'pretiusVersion', `v${chrome.runtime.getManifest().version}`)
  );
  return div;
}
