// core/EventBus.js
// Barramento de eventos genérico usado por TODOS os sistemas do OGEID STUDIO.
// Nenhum sistema chama outro diretamente — eles se comunicam emitindo/ouvindo
// eventos aqui. Isso é o que permite, na Fase futura, que o EventSystem do
// editor (ON_PLAYER_PAINT -> INCREASE_WANTED -> SPAWN_GUARD, etc.) funcione
// sem o Runtime precisar conhecer o RuleEngine.

export class EventBus {
  constructor() {
    this._listeners = new Map(); // event name -> Set<fn>
    this._log = [];              // histórico simples, útil pro Console do editor
    this._logLimit = 200;
  }

  on(eventName, fn) {
    if (!this._listeners.has(eventName)) this._listeners.set(eventName, new Set());
    this._listeners.get(eventName).add(fn);
    return () => this.off(eventName, fn); // retorna função de "unsubscribe"
  }

  off(eventName, fn) {
    const set = this._listeners.get(eventName);
    if (set) set.delete(fn);
  }

  once(eventName, fn) {
    const unsub = this.on(eventName, (payload) => { unsub(); fn(payload); });
    return unsub;
  }

  emit(eventName, payload = {}) {
    this._log.push({ t: performance.now(), eventName, payload });
    if (this._log.length > this._logLimit) this._log.shift();

    const set = this._listeners.get(eventName);
    if (!set || set.size === 0) return;
    // copia pra Set não quebrar se um handler fizer on/off durante o emit
    for (const fn of Array.from(set)) {
      try {
        fn(payload, eventName);
      } catch (err) {
        console.error(`[EventBus] erro no handler de "${eventName}":`, err);
      }
    }
  }

  history() {
    return this._log.slice();
  }
}
