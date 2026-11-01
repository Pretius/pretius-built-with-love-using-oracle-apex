// "Hearts collected": an opt-in, on-device list of Oracle APEX sites visited.
//
// Storage (IndexedDB, shared by the service worker and the popup):
//   settings/keys     { aes, hmac } non-extractable CryptoKeys. The browser can
//                     use them, but no script can read or export the raw keys.
//   settings/collect  true when the user has opted in.
//   hearts/<id>       { iv, data }: AES-GCM encrypted { host, firstSeen }.
//                     <id> is an HMAC of the host, so duplicates are detected
//                     without storing the host name in plain text.
//
// One record per site means adding a heart never rewrites existing data, so
// the popup and the service worker can't overwrite each other's changes.

const DB_NAME = 'built-with-love';
const DB_VERSION = 1;
const SETTINGS = 'settings';
const HEARTS = 'hearts';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(SETTINGS);
      request.result.createObjectStore(HEARTS);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Runs one request in its own transaction and resolves when it commits.
async function run(storeName, mode, makeRequest) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const request = makeRequest(transaction.objectStore(storeName));
      let result;
      request.onsuccess = () => {
        result = request.result;
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error || request.error);
      transaction.onabort = () => reject(transaction.error || request.error);
    });
  } finally {
    db.close();
  }
}

// Like run(), but an "already exists" error is not a failure.
async function addIfAbsent(storeName, value, key) {
  try {
    await run(storeName, 'readwrite', (store) => store.add(value, key));
    return true;
  } catch (error) {
    if (error && error.name === 'ConstraintError') {
      return false;
    }
    throw error;
  }
}

async function getKeys() {
  const existing = await run(SETTINGS, 'readonly', (store) => store.get('keys'));
  if (existing) {
    return existing;
  }
  const aes = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const hmac = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  // If the popup and service worker race here, the first one wins and both use it.
  await addIfAbsent(SETTINGS, { aes, hmac }, 'keys');
  return run(SETTINGS, 'readonly', (store) => store.get('keys'));
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function isCollecting() {
  return (await run(SETTINGS, 'readonly', (store) => store.get('collect'))) === true;
}

export async function setCollecting(on) {
  await run(SETTINGS, 'readwrite', (store) => store.put(on === true, 'collect'));
}

// Records a site if collecting is on. Returns true when it's a new heart.
export async function recordHeart(host) {
  if (!host || !(await isCollecting())) {
    return false;
  }
  const { aes, hmac } = await getKeys();
  const encoder = new TextEncoder();
  const id = toHex(await crypto.subtle.sign('HMAC', hmac, encoder.encode(host)));

  const known = await run(HEARTS, 'readonly', (store) => store.count(id));
  if (known > 0) {
    return false;
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = encoder.encode(JSON.stringify({ host, firstSeen: Date.now() }));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, plain);
  return addIfAbsent(HEARTS, { iv, data }, id);
}

export async function countHearts() {
  return run(HEARTS, 'readonly', (store) => store.count());
}

// Decrypts and returns [{ host, firstSeen }], sorted by host.
export async function listHearts() {
  const records = await run(HEARTS, 'readonly', (store) => store.getAll());
  if (records.length === 0) {
    return [];
  }
  const { aes } = await getKeys();
  const decoder = new TextDecoder();
  const hearts = [];
  for (const record of records) {
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: record.iv }, aes, record.data);
      hearts.push(JSON.parse(decoder.decode(plain)));
    } catch {
      // Skip a record that can't be decrypted rather than losing the whole list.
    }
  }
  return hearts.sort((a, b) => a.host.localeCompare(b.host));
}

export async function clearHearts() {
  await run(HEARTS, 'readwrite', (store) => store.clear());
}
