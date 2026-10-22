// Tiny key-value layer over IndexedDB with an in-memory twin (tests, private
// windows where IndexedDB is unavailable). Values must be structured-cloneable.

export type StoreName = "drafts" | "queue" | "files" | "payloads";
const STORES: readonly StoreName[] = ["drafts", "queue", "files", "payloads"];

export interface KvStore {
  get<T>(store: StoreName, key: string): Promise<T | undefined>;
  put<T>(store: StoreName, key: string, value: T): Promise<void>;
  delete(store: StoreName, key: string): Promise<void>;
  /** All values of a store (small stores only: one phone, a handful of links). */
  all<T>(store: StoreName): Promise<T[]>;
  /** false when data won't survive a reload (memory fallback). */
  readonly persistent: boolean;
}

export class MemoryKv implements KvStore {
  readonly persistent = false;
  private data = new Map<StoreName, Map<string, unknown>>(STORES.map((s) => [s, new Map()]));

  async get<T>(store: StoreName, key: string) {
    return structuredClone(this.data.get(store)?.get(key)) as T | undefined;
  }
  async put<T>(store: StoreName, key: string, value: T) {
    this.data.get(store)?.set(key, structuredClone(value));
  }
  async delete(store: StoreName, key: string) {
    this.data.get(store)?.delete(key);
  }
  async all<T>(store: StoreName) {
    return [...(this.data.get(store)?.values() ?? [])].map((v) => structuredClone(v) as T);
  }
}

const DB_NAME = "sssso-forms";
const DB_VERSION = 1;

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export class IdbKv implements KvStore {
  readonly persistent = true;
  private constructor(private readonly db: IDBDatabase) {}

  static open(): Promise<IdbKv> {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open(DB_NAME, DB_VERSION);
      r.onupgradeneeded = () => {
        for (const s of STORES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s);
      };
      r.onsuccess = () => resolve(new IdbKv(r.result));
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(new Error("IndexedDB blocked"));
    });
  }

  private tx(store: StoreName, mode: IDBTransactionMode) {
    return this.db.transaction(store, mode).objectStore(store);
  }
  async get<T>(store: StoreName, key: string) {
    return (await req(this.tx(store, "readonly").get(key))) as T | undefined;
  }
  async put<T>(store: StoreName, key: string, value: T) {
    await req(this.tx(store, "readwrite").put(value, key));
  }
  async delete(store: StoreName, key: string) {
    await req(this.tx(store, "readwrite").delete(key));
  }
  async all<T>(store: StoreName) {
    return (await req(this.tx(store, "readonly").getAll())) as T[];
  }
}

let shared: Promise<KvStore> | null = null;

/** The browser's store: IndexedDB, or memory when it can't be opened. */
export function browserKv(): Promise<KvStore> {
  shared ??= (typeof indexedDB === "undefined" ? Promise.reject(new Error("no idb")) : IdbKv.open()).catch(() => new MemoryKv());
  return shared;
}
