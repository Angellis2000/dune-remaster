/**
 * ROM и свои картинки хранятся только в браузере игрока (IndexedDB), чтобы не выбирать файлы
 * каждый раз. Никуда не отправляются. Если хранилище недоступно (приватный режим и т. п.) —
 * просто не запоминаем.
 */
const DB = "dune-remaster";
const STORE = "rom";
const SKINS = "skins";
const KEY = "current";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(SKINS)) db.createObjectStore(SKINS);
    };
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

/** Все свои картинки: ключ вида "structure:8" -> файл. */
export async function loadSkinFiles(): Promise<Map<string, Blob>> {
  const out = new Map<string, Blob>();
  try {
    const db = await open();
    await new Promise<void>((resolve) => {
      const req = db.transaction(SKINS).objectStore(SKINS).openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return resolve();
        out.set(String(c.key), c.value as Blob);
        c.continue();
      };
      req.onerror = () => resolve();
    });
  } catch {
    /* хранилище недоступно */
  }
  return out;
}

export async function storeSkinFile(key: string, file: Blob | null): Promise<void> {
  try {
    const db = await open();
    const store = db.transaction(SKINS, "readwrite").objectStore(SKINS);
    if (file) store.put(file, key);
    else store.delete(key);
  } catch {
    /* хранилище недоступно — картинка проживёт до перезагрузки */
  }
}
