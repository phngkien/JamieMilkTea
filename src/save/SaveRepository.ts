// Ghi/đọc bản lưu trên máy: IndexedDB (chính) + localStorage (dự phòng).
// Khi đọc, lấy bản có updatedAt mới hơn trong hai nơi.
import { migrate, newest, type SaveData } from './schema';

const DB_NAME = 'jamie-milk-tea';
const STORE = 'saves';
const KEY = 'main';
const LOCAL_KEY = 'jamie-milk-tea/save';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Không có IndexedDB'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Chạy một thao tác trên kho IndexedDB rồi đóng kết nối. */
async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export class SaveRepository {
  async load(): Promise<SaveData | null> {
    const [fromDb, fromLocal] = await Promise.all([this.loadDb(), this.loadLocal()]);
    return newest(fromDb, fromLocal);
  }

  /** Ghi cả hai nơi. Một nơi lỗi (ví dụ trình duyệt chặn) thì vẫn còn nơi kia. */
  async save(data: SaveData): Promise<void> {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    } catch {
      // localStorage bị chặn hoặc đầy — bỏ qua, còn IndexedDB
    }
    try {
      await withStore('readwrite', (store) => store.put(data, KEY));
    } catch {
      // IndexedDB không dùng được (chế độ riêng tư...) — đã có localStorage
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(LOCAL_KEY);
    } catch {
      // bỏ qua
    }
    try {
      await withStore('readwrite', (store) => store.delete(KEY));
    } catch {
      // bỏ qua
    }
  }

  private async loadDb(): Promise<SaveData | null> {
    try {
      return migrate(await withStore('readonly', (store) => store.get(KEY)));
    } catch {
      return null;
    }
  }

  private loadLocal(): SaveData | null {
    try {
      const text = localStorage.getItem(LOCAL_KEY);
      return text ? migrate(JSON.parse(text)) : null;
    } catch {
      return null;
    }
  }
}
