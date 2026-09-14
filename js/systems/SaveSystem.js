/**
 * SaveSystem.js
 * Camada de persistência local. Usa IndexedDB para guardar os binários dos
 * GLB importados (podem ser grandes) e snapshots de projeto, e usa
 * localStorage apenas para ponteiros pequenos (id do último projeto,
 * autosave leve). Sem backend: tudo roda 100% no navegador.
 */

import { DB_NAME, DB_VERSION, STORE_ASSETS, STORE_PROJECTS, LS_LAST_PROJECT, LS_AUTOSAVE_KEY } from '../core/Constants.js';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_ASSETS)) {
        db.createObjectStore(STORE_ASSETS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function tx(storeName, mode) {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

export const SaveSystem = {
  // ---------- Assets (blobs de GLB) ----------
  async putAsset(record) {
    const store = await tx(STORE_ASSETS, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  },

  async getAsset(id) {
    const store = await tx(STORE_ASSETS, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async getAllAssets() {
    const store = await tx(STORE_ASSETS, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteAsset(id) {
    const store = await tx(STORE_ASSETS, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  // ---------- Projetos (JSON) ----------
  async putProject(project) {
    const store = await tx(STORE_PROJECTS, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(project);
      req.onsuccess = () => resolve(project);
      req.onerror = () => reject(req.error);
    });
  },

  async getProject(id) {
    const store = await tx(STORE_PROJECTS, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async getAllProjects() {
    const store = await tx(STORE_PROJECTS, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteProject(id) {
    const store = await tx(STORE_PROJECTS, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  // ---------- Ponteiros rápidos (localStorage) ----------
  setLastProjectId(id) {
    localStorage.setItem(LS_LAST_PROJECT, id);
  },
  getLastProjectId() {
    return localStorage.getItem(LS_LAST_PROJECT);
  },
  autosave(projectJson) {
    try {
      localStorage.setItem(LS_AUTOSAVE_KEY, JSON.stringify(projectJson));
    } catch (err) {
      // localStorage tem limite pequeno (~5MB); autosave é best-effort.
      console.warn('[SaveSystem] autosave falhou (provavelmente projeto grande demais para localStorage)', err);
    }
  },
  getAutosave() {
    const raw = localStorage.getItem(LS_AUTOSAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  },
};
