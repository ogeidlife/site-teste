// assets/AssetManager.js
// Unifica o que hoje está duplicado em ogeid-configurador.html e
// ogeid-game.html (dois IndexedDBs diferentes fazendo a mesma coisa).
// Guarda blobs (imagens, .glb, áudio, vídeo) por chave. Studio e Runtime
// usam a MESMA instância/formato — resolve o problema de "salvei no
// configurador mas o jogo não achou o asset".

const DB_NAME = "ogeid_studio_assets";
const DB_VERSION = 1;
const STORE = "assets";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class AssetManager {
  constructor() {
    this._db = null;
    this._blobCache = new Map();   // key -> Blob
    this._objectURLCache = new Map(); // key -> object URL (pra <img>/<video> reaproveitar)
  }

  async _getDB() {
    if (!this._db) this._db = await openDB();
    return this._db;
  }

  async set(key, blob) {
    const db = await this._getDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    this._blobCache.set(key, blob);
    this._invalidateURL(key);
  }

  async get(key) {
    if (this._blobCache.has(key)) return this._blobCache.get(key);
    const db = await this._getDB();
    const blob = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (blob) this._blobCache.set(key, blob);
    return blob;
  }

  async has(key) {
    return (await this.get(key)) != null;
  }

  async delete(key) {
    const db = await this._getDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    this._blobCache.delete(key);
    this._invalidateURL(key);
  }

  // Retorna uma object URL estável para usar em <img src>, <video src>,
  // ou pro GLTFLoader carregar. Reaproveita a URL enquanto o blob não mudar.
  async resolveURL(key) {
    if (!key) return null;
    if (this._objectURLCache.has(key)) return this._objectURLCache.get(key);
    const blob = await this.get(key);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    this._objectURLCache.set(key, url);
    return url;
  }

  _invalidateURL(key) {
    const url = this._objectURLCache.get(key);
    if (url) URL.revokeObjectURL(url);
    this._objectURLCache.delete(key);
  }

  async listKeys() {
    const db = await this._getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAllKeys();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}
