// EventBus.js
// Pub/sub minimalista. Todos os sistemas (editor e jogo) se comunicam por aqui
// em vez de se chamarem diretamente — isso é o que permite plugar cada fase
// (Guard AI, Missions, Video, etc.) sem reescrever o que já existe.

export class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(event, callback) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this._listeners.get(event)?.delete(callback);
  }

  emit(event, payload) {
    this._listeners.get(event)?.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[EventBus] listener error for "${event}"`, err);
      }
    });
  }
}

// Instância global compartilhada por todo o app do configurador.
export const bus = new EventBus();
