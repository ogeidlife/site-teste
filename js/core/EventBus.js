/**
 * EventBus.js
 * Sistema de eventos simples (pub/sub) usado para desacoplar os módulos.
 * Qualquer sistema pode emitir ou escutar eventos sem conhecer os outros
 * diretamente. Isso é o que permite a arquitetura crescer em fases sem
 * reescrever tudo a cada nova feature.
 */

export class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  /** Registra um listener para um evento. Retorna função de "unsubscribe". */
  on(event, callback) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  once(event, callback) {
    const off = this.on(event, (...args) => {
      off();
      callback(...args);
    });
    return off;
  }

  off(event, callback) {
    if (this._listeners.has(event)) this._listeners.get(event).delete(callback);
  }

  emit(event, payload) {
    if (!this._listeners.has(event)) return;
    for (const cb of [...this._listeners.get(event)]) {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[EventBus] erro no listener de "${event}"`, err);
      }
    }
  }
}

// Instância única compartilhada por todo o configurador/jogo.
export const bus = new EventBus();
