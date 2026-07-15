/* ELTECH Personality - Camada de dados (IndexedDB)
 * Wrapper simples baseado em Promises. Um único banco com várias "stores"
 * já preparadas para os próximos módulos (medidas, histórico, notificações...).
 */
(function (global) {
  "use strict";

  const DB_NAME = "PERSONALITY_DB";
  const DB_VERSION = 1;

  // Definição das object stores. keyPath define a chave primária.
  const STORES = {
    users: { keyPath: "email", indexes: [] },
    plans: { keyPath: "id", indexes: [{ name: "owner", keyPath: "owner" }] },
    logs: {
      keyPath: "id",
      indexes: [
        { name: "owner", keyPath: "owner" },
        { name: "exercise", keyPath: "exerciseKey" }
      ]
    },
    settings: { keyPath: "key", indexes: [] },
    // Reservadas para módulos futuros:
    measures: { keyPath: "id", indexes: [{ name: "owner", keyPath: "owner" }] },
    history: { keyPath: "id", indexes: [{ name: "owner", keyPath: "owner" }] },
    notifications: { keyPath: "id", indexes: [{ name: "owner", keyPath: "owner" }] }
  };

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        Object.keys(STORES).forEach((name) => {
          if (!db.objectStoreNames.contains(name)) {
            const cfg = STORES[name];
            const store = db.createObjectStore(name, { keyPath: cfg.keyPath });
            (cfg.indexes || []).forEach((idx) =>
              store.createIndex(idx.name, idx.keyPath, { unique: !!idx.unique })
            );
          }
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function tx(storeName, mode) {
    return open().then(
      (db) => db.transaction(storeName, mode).objectStore(storeName)
    );
  }

  function reqToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  const DB = {
    async put(store, value) {
      const s = await tx(store, "readwrite");
      return reqToPromise(s.put(value));
    },
    async get(store, key) {
      const s = await tx(store, "readonly");
      return reqToPromise(s.get(key));
    },
    async delete(store, key) {
      const s = await tx(store, "readwrite");
      return reqToPromise(s.delete(key));
    },
    async getAll(store) {
      const s = await tx(store, "readonly");
      return reqToPromise(s.getAll());
    },
    async getAllByIndex(store, indexName, value) {
      const s = await tx(store, "readonly");
      return reqToPromise(s.index(indexName).getAll(value));
    },
    async clear(store) {
      const s = await tx(store, "readwrite");
      return reqToPromise(s.clear());
    },
    async count(store) {
      const s = await tx(store, "readonly");
      return reqToPromise(s.count());
    },
    stores: Object.keys(STORES)
  };

  global.DB = DB;
})(window);
