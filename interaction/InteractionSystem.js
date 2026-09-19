// interaction/InteractionSystem.js
// Sistema universal de interação (seção 3 do prompt). Toda interação do
// jogador com o mundo passa por AQUI — nunca por um "if" solto no loop do
// jogo. Cada TIPO de interação (PAINT, CLIMB, VAULT, ...) registra um
// "handler" com uma interface fixa; o InteractionSystem não sabe nada sobre
// pintura especificamente, só sabe orquestrar: achar, checar, iniciar,
// atualizar, terminar.
//
// Contrato de um handler:
//   canStart(def, worldState)                   -> bool
//   start(def, worldState, ctx)                 -> void   (ctx: { eventBus, assetManager })
//   update(def, worldState, dt, ctx, elapsed)    -> void   (chamado só enquanto "ativa"; elapsed = segundos desde o start)
//   isDone(def, worldState, elapsed)             -> bool
//   finish(def, worldState, ctx)                 -> void

export class InteractionSystem {
  constructor({ eventBus, assetManager }) {
    this.eventBus = eventBus;
    this.assetManager = assetManager;
    this.handlersByType = new Map();   // type -> handler
    this.definitions = new Map();      // id -> definição (do Project JSON)
    this.active = new Map();           // id -> { elapsed:0 } estado de execução em andamento
    this.cooldownUntil = new Map();    // id -> timestamp
  }

  registerHandler(type, handler) {
    this.handlersByType.set(type, handler);
  }

  loadFromProject(project) {
    this.definitions.clear();
    (project.interactions || []).forEach((def) => this.definitions.set(def.id, def));
  }

  getDefinition(id) {
    return this.definitions.get(id) || null;
  }

  // Retorna as interações habilitadas dentro de um raio da posição do jogador.
  // position: {x, y}. Cada definição precisa ter um "position" e um "radius"
  // (default 2) para poder ser encontrada por proximidade.
  findNearby(position, extraRadius = 0) {
    const found = [];
    for (const def of this.definitions.values()) {
      if (def.enabled === false) continue;
      if (!def.position) continue;
      const r = (def.radius ?? 2) + extraRadius;
      const dx = position.x - def.position.x;
      const dy = position.y - def.position.y;
      if (dx * dx + dy * dy <= r * r) found.push(def);
    }
    return found;
  }

  canTrigger(id, worldState) {
    const def = this.definitions.get(id);
    if (!def || def.enabled === false) return false;
    if (this.active.has(id)) return false;
    const cd = this.cooldownUntil.get(id);
    if (cd && performance.now() < cd) return false;
    const handler = this.handlersByType.get(def.type);
    if (!handler) {
      console.warn(`[InteractionSystem] nenhum handler registrado para o tipo "${def.type}"`);
      return false;
    }
    return handler.canStart(def, worldState);
  }

  trigger(id, worldState) {
    if (!this.canTrigger(id, worldState)) return false;
    const def = this.definitions.get(id);
    const handler = this.handlersByType.get(def.type);
    this.active.set(id, { elapsed: 0 });
    handler.start(def, worldState, { eventBus: this.eventBus, assetManager: this.assetManager });
    this.eventBus.emit("ON_INTERACTION_START", { id, type: def.type });
    return true;
  }

  // Chamar a cada frame do loop principal.
  update(dt, worldState) {
    for (const [id, activeState] of Array.from(this.active.entries())) {
      const def = this.definitions.get(id);
      const handler = this.handlersByType.get(def.type);
      activeState.elapsed += dt;
      handler.update(def, worldState, dt, { eventBus: this.eventBus, assetManager: this.assetManager }, activeState.elapsed);

      if (handler.isDone(def, worldState, activeState.elapsed)) {
        handler.finish(def, worldState, { eventBus: this.eventBus, assetManager: this.assetManager });
        this.active.delete(id);
        if (def.cooldown) this.cooldownUntil.set(id, performance.now() + def.cooldown * 1000);
        this.eventBus.emit("ON_INTERACTION_COMPLETE", { id, type: def.type });
      }
    }
  }

  isActive(id) {
    return this.active.has(id);
  }
}
