// IndexedDB persistence. Everything stays on the device. Two stores:
//   kv     - one JSON document per state slice
//   photos - {id, full: Blob, thumb: Blob}
const NAME = 'forma';
let dbp;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}
const run = async (store, mode, fn) => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const r = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(r?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

export const kvGet = (k) => run('kv', 'readonly', (s) => s.get(k));
export const kvSet = (k, v) => run('kv', 'readwrite', (s) => s.put(v, k));
export const kvAll = async () => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const out = {};
    const tx = db.transaction('kv', 'readonly');
    const req = tx.objectStore('kv').openCursor();
    req.onsuccess = () => { const c = req.result; if (c) { out[c.key] = c.value; c.continue(); } };
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
  });
};
export const kvClear = () => run('kv', 'readwrite', (s) => s.clear());

export const photoPut = (rec) => run('photos', 'readwrite', (s) => s.put(rec));
export const photoGet = (id) => run('photos', 'readonly', (s) => s.get(id));
export const photoDel = (id) => run('photos', 'readwrite', (s) => s.delete(id));
export const photoClear = () => run('photos', 'readwrite', (s) => s.clear());
export const photoAll = async () => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const out = [];
    const tx = db.transaction('photos', 'readonly');
    const req = tx.objectStore('photos').openCursor();
    req.onsuccess = () => { const c = req.result; if (c) { out.push(c.value); c.continue(); } };
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
  });
};

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistence() {
  try { return await navigator.storage?.persist?.(); } catch { return false; }
}
