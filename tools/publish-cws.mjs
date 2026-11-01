// Uploads a zip to the Chrome Web Store and submits it for review,
// using the Chrome Web Store API v2.
// https://developer.chrome.com/docs/webstore/using-api
//
// Usage: node tools/publish-cws.mjs <path-to-zip>
// Env:   CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN,
//        CWS_PUBLISHER_ID, CWS_EXTENSION_ID
import { readFile } from 'node:fs/promises';

const API = 'https://chromewebstore.googleapis.com';
const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS = 30;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const inProgress = (state) => state === 'IN_PROGRESS' || state === 'UPLOAD_IN_PROGRESS';

async function getAccessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: requireEnv('CWS_CLIENT_ID'),
      client_secret: requireEnv('CWS_CLIENT_SECRET'),
      refresh_token: requireEnv('CWS_REFRESH_TOKEN'),
      grant_type: 'refresh_token'
    })
  });
  const json = await response.json();
  if (!response.ok || !json.access_token) {
    throw new Error(`Could not get access token (${response.status}): ${json.error_description || json.error || 'unknown error'}`);
  }
  return json.access_token;
}

async function call(method, url, token, body, contentType) {
  const headers = { Authorization: `Bearer ${token}` };
  if (contentType) headers['Content-Type'] = contentType;
  const response = await fetch(url, { method, headers, body });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${url} failed (${response.status}): ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

async function main() {
  const zipPath = process.argv[2];
  if (!zipPath) {
    throw new Error('Usage: node tools/publish-cws.mjs <path-to-zip>');
  }
  const item = `publishers/${requireEnv('CWS_PUBLISHER_ID')}/items/${requireEnv('CWS_EXTENSION_ID')}`;
  const token = await getAccessToken();

  console.log(`Uploading ${zipPath}...`);
  const upload = await call('POST', `${API}/upload/v2/${item}:upload`, token, await readFile(zipPath), 'application/zip');
  console.log('Upload response:', JSON.stringify(upload));

  let state = upload.uploadState;
  for (let poll = 0; inProgress(state) && poll < MAX_POLLS; poll++) {
    await sleep(POLL_INTERVAL_MS);
    const status = await call('GET', `${API}/v2/${item}:fetchStatus`, token);
    state = status.lastAsyncUploadState;
    console.log(`Upload state: ${state}`);
  }
  if (state !== 'SUCCEEDED') {
    throw new Error(`Upload did not succeed (state: ${state}). Nothing was submitted.`);
  }

  console.log('Submitting for review...');
  const publish = await call('POST', `${API}/v2/${item}:publish`, token);
  console.log('Publish response:', JSON.stringify(publish));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
