// Checks every _locales/<lang>/messages.json has exactly the same keys and
// placeholders as English, so a missing translation fails CI instead of
// showing a raw message name in the popup.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const LOCALES_DIR = join('src', '_locales');

async function load(lang) {
  return JSON.parse(await readFile(join(LOCALES_DIR, lang, 'messages.json'), 'utf8'));
}

function placeholders(entry) {
  return Object.keys(entry.placeholders || {}).sort().join(',');
}

async function main() {
  const english = await load('en');
  const langs = (await readdir(LOCALES_DIR)).filter((lang) => lang !== 'en');
  const problems = [];

  for (const lang of langs) {
    const messages = await load(lang);
    for (const key of Object.keys(english)) {
      if (!messages[key]) {
        problems.push(`${lang}: missing "${key}"`);
      } else if (placeholders(messages[key]) !== placeholders(english[key])) {
        problems.push(`${lang}: placeholders differ for "${key}"`);
      } else if (english[key].message.includes('{apex}') && !messages[key].message.includes('{apex}')) {
        problems.push(`${lang}: "${key}" is missing the {apex} token`);
      }
    }
    for (const key of Object.keys(messages)) {
      if (!english[key]) {
        problems.push(`${lang}: unknown key "${key}"`);
      }
    }
  }

  if (problems.length > 0) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log(`Locales OK: en + ${langs.join(', ')}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
