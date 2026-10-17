/**
 * ROM хранится только в браузере игрока (IndexedDB), чтобы не выбирать файл каждый раз.
 * Никуда не отправляется. Если хранилище недоступно (приватный режим и т. п.) — просто не запоминаем.
 */
const DB = "dune-remaster";
const STORE = "rom";
const KEY = "current";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadStoredRom(): Promise<{ name: string; bytes: Uint8Array } | null> {
  try {
    const db = await open();
    return await new Promise((resolve) => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY);
      req.onsuccess = () => {
        const v = req.result as { name: string; data: ArrayBuffer } | undefined;
        resolve(v ? { name: v.name, bytes: new Uint8Array(v.data) } : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function storeRom(name: string, bytes: Uint8Array): Promise<void> {
  try {
    const db = await open();
    const data = bytes.slice().buffer;
    db.transaction(STORE, "readwrite").objectStore(STORE).put({ name, data }, KEY);
  } catch {
    /* хранилище недоступно — не страшно */
  }
}

export async function forgetRom(): Promise<void> {
  try {
    const db = await open();
    db.transaction(STORE, "readwrite").objectStore(STORE).delete(KEY);
  } catch {
    /* нечего удалять */
  }
}
