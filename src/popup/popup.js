import { detectApex, setActionState, NOT_APEX } from '../lib/apex-detect.js';
import * as hearts from '../lib/hearts.js';

const APEX_URL = 'https://apex.oracle.com/';
const APEX_TOKEN = '{apex}';
const STORE_URL = 'https://chromewebstore.google.com/detail/built-with-love-using-ora/bhlkijnameeejlifhlmhcfjgmigdpjae';
const HEARTBROKEN_COUNT = 9;

document.addEventListener('DOMContentLoaded', initializePopup);

function t(name, substitutions) {
  return chrome.i18n.getMessage(name, substitutions) || name;
}

async function initializePopup() {
  document.documentElement.lang = chrome.i18n.getUILanguage();
  const content = document.getElementById('content');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const hasTab = Boolean(tab && tab.id !== undefined);
  const incognito = hasTab && tab.incognito;

  // Detect on open, so tabs loaded before install/update are still correct.
  const result = hasTab ? await detectApex(tab.id) : NOT_APEX;
  if (hasTab) {
    setActionState(tab.id, result);
  }
  const recordCurrent = async () => {
    if (result.isApex && !incognito) {
      await hearts.recordHeart(result.host).catch(() => false);
    }
  };
  await recordCurrent();

  const body = el('div', 'popup-content-body');
  if (result.isApex) {
    const rows = envRows(result);
    body.append(apexHeader(rows, result.host));
    if (result.inFrame && result.host) {
      body.append(el('p', 'note', t('foundInFrame', [result.host])));
    }
    if (rows.length > 0) {
      body.append(envTable(rows));
    }
  } else {
    const index = 1 + Math.floor(Math.random() * HEARTBROKEN_COUNT);
    body.append(heading(t(`heartbroken${index}`)));
  }

  const sections = [body];
  if (!incognito) {
    sections.push(heartsSection(recordCurrent));
  }
  sections.push(footer());
  content.replaceChildren(...sections);
}

// ---------- DOM helpers (page-supplied values only ever go in textContent) ----------

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

function button(text, onClick, className = 'btn') {
  const b = el('button', className, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

// Builds an <h3>, replacing {apex} with an Oracle APEX link.
function heading(template) {
  const h3 = el('h3');
  const parts = template.split(APEX_TOKEN);
  if (parts.length < 2) {
    h3.textContent = template;
    return h3;
  }
  h3.append(parts[0], link(APEX_URL, 'Oracle APEX', 'pretiusHiddenLink'), parts.slice(1).join(APEX_TOKEN));
  return h3;
}

// Briefly swaps a button's label, e.g. "Copied!".
function flash(target, text) {
  const original = target.textContent;
  target.textContent = text;
  target.disabled = true;
  setTimeout(() => {
    target.textContent = original;
    target.disabled = false;
  }, 1500);
}

function openLinkedInShare(text) {
  const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
  chrome.tabs.create({ url });
}

// ---------- APEX page ----------

function envRows(result) {
  const rows = { ...result.env };
  if (result.utVersion) {
    rows.UNIVERSAL_THEME_VERSION = result.utVersion;
  }
  return Object.entries(rows).sort(([a], [b]) => a.localeCompare(b));
}

function envTable(rows) {
  const table = el('table', 'blue-theme');
  const headRow = el('tr');
  headRow.append(el('th', null, t('attribute')), el('th', null, t('value')));
  table.append(headRow);
  for (const [key, value] of rows) {
    const row = el('tr');
    row.append(el('td', null, key), el('td', null, value));
    table.append(row);
  }
  return table;
}

function toMarkdown(rows) {
  const escape = (text) => text.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  const lines = [`| ${t('attribute')} | ${t('value')} |`, '| --- | --- |'];
  for (const [key, value] of rows) {
    lines.push(`| ${escape(key)} | ${escape(value)} |`);
  }
  return lines.join('\n');
}

// Menu item that copies text and shows "Copied!" on itself. Stays open so the
// confirmation can be seen.
function copyItem(label, makeText) {
  const item = menuItem(label, async () => {
    try {
      await navigator.clipboard.writeText(makeText());
      flash(item, t('copied'));
    } catch {
      flash(item, t('copyFailed'));
    }
  }, { keepOpen: true });
  return item;
}

// Share button | "Built with ❤️ using Oracle APEX" | copy "⋯" menu
function apexHeader(rows, host) {
  const header = el('div', 'apex-header');

  if (host) {
    // Share the site's origin only: full APEX URLs can contain session IDs.
    const share = button(t('shareSite'), () => openLinkedInShare(t('shareSiteText', [`https://${host}/`, STORE_URL])), 'btn btn-primary header-share');
    header.append(share);
  } else {
    header.append(el('span'));
  }

  header.append(heading(t('builtWith')));

  if (rows.length > 0) {
    header.append(menuButton(t('copyMenu'), [
      copyItem(t('copyJson'), () => JSON.stringify(Object.fromEntries(rows), null, 2)),
      copyItem(t('copyMarkdown'), () => toMarkdown(rows))
    ]));
  } else {
    header.append(el('span'));
  }
  return header;
}

// ---------- Hearts collected ----------

function heartsSection(recordCurrent) {
  const section = el('div', 'hearts');

  async function render() {
    try {
      if (!(await hearts.isCollecting())) {
        section.replaceChildren(
          el('p', 'hearts-intro', t('heartsIntro')),
          button(t('heartsTurnOn'), async () => {
            await hearts.setCollecting(true);
            await recordCurrent();
            render();
          }, 'btn btn-primary')
        );
        return;
      }

      const count = await hearts.countHearts();
      const items = [];
      if (count > 0) {
        items.push(menuItem(t('heartsShare'), () => openLinkedInShare(t('heartsShareText', [String(count), STORE_URL]))));
        items.push(clearItem());
      }
      items.push(menuItem(t('heartsTurnOff'), async () => {
        await hearts.setCollecting(false);
        render();
      }));

      // Count in the middle, "⋯" menu on the right.
      const header = el('div', 'hearts-header');
      header.append(el('span'), el('p', 'hearts-count', t('heartsCount', [String(count)])), menuButton(t('heartsMenu'), items));

      section.replaceChildren(header, count > 0 ? siteList() : el('p', 'note', t('heartsEmpty')));
    } catch {
      section.replaceChildren(el('p', 'note', t('heartsError')));
    }
  }

  // Decrypts the list only when the user opens it.
  function siteList() {
    const details = el('details', 'hearts-list');
    details.append(el('summary', null, t('heartsShow')));
    const list = el('ul');
    details.append(list);
    details.addEventListener('toggle', async () => {
      if (!details.open || list.childElementCount > 0) return;
      try {
        for (const heart of await hearts.listHearts()) {
          list.append(el('li', null, heart.host));
        }
      } catch {
        list.append(el('li', 'note', t('heartsError')));
      }
    });
    return details;
  }

  // Two clicks to clear, so it can't happen by accident. Keeps the menu open
  // after the first click so the confirmation can be seen.
  function clearItem() {
    let armed = false;
    let timer;
    const item = menuItem(t('heartsClear'), async () => {
      if (!armed) {
        armed = true;
        item.textContent = t('heartsClearConfirm');
        item.classList.add('danger');
        timer = setTimeout(() => {
          armed = false;
          item.textContent = t('heartsClear');
          item.classList.remove('danger');
        }, 3000);
        return;
      }
      clearTimeout(timer);
      await hearts.clearHearts();
      render();
    }, { keepOpen: true });
    return item;
  }

  render();
  return section;
}

// ---------- Menu ----------

function menuItem(text, onClick, { keepOpen = false } = {}) {
  const item = button(text, onClick, 'menu-item');
  item.setAttribute('role', 'menuitem');
  if (keepOpen) item.dataset.keepOpen = 'true';
  return item;
}

// A "⋯" button that opens a small menu above it. Closes on outside click,
// Escape, or choosing an item.
function menuButton(label, items) {
  const wrapper = el('div', 'menu');
  const toggle = button('⋯', () => (list.hidden ? open() : close()), 'btn menu-toggle');
  toggle.title = label;
  toggle.setAttribute('aria-label', label);
  toggle.setAttribute('aria-haspopup', 'menu');
  toggle.setAttribute('aria-expanded', 'false');

  const list = el('div', 'menu-list');
  list.setAttribute('role', 'menu');
  list.hidden = true;

  const onOutsideClick = (event) => {
    if (!wrapper.contains(event.target)) close();
  };
  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      close();
      toggle.focus();
    }
  };

  function open() {
    list.hidden = false;
    // Open upwards when there's room (over the table); otherwise downwards,
    // growing the popup so the menu isn't cut off.
    const top = wrapper.getBoundingClientRect().top + window.scrollY;
    const openDown = top < list.offsetHeight + 8;
    list.classList.toggle('open-down', openDown);
    if (openDown) {
      document.body.style.minHeight = `${top + wrapper.offsetHeight + list.offsetHeight + 12}px`;
    }
    toggle.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', onOutsideClick);
    document.addEventListener('keydown', onKeyDown);
    list.querySelector('button')?.focus();
  }

  function close() {
    list.hidden = true;
    document.body.style.minHeight = '';
    toggle.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onOutsideClick);
    document.removeEventListener('keydown', onKeyDown);
  }

  for (const item of items) {
    if (!item.dataset.keepOpen) item.addEventListener('click', close);
    list.append(item);
  }
  wrapper.append(toggle, list);
  return wrapper;
}

// ---------- Footer ----------

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
