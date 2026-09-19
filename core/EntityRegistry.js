// core/EntityRegistry.js
// ECS leve: uma Entity é só um id + um saco de componentes (objetos planos de
// dados). Sistemas fazem query() por componente e operam sobre o resultado.
// Isso é o que substitui os "objetos globais soltos" (Player, State, CONFIG)
// do ogeid-game.html atual.

export class EntityRegistry {
  constructor(eventBus = null) {
    this._entities = new Map(); // id -> { id, components: Map<name, data> }
    this.eventBus = eventBus;
  }

  create(id, components = {}) {
    if (this._entities.has(id)) {
      throw new Error(`[EntityRegistry] já existe uma entidade com id "${id}"`);
    }
    const compMap = new Map(Object.entries(components));
    const entity = { id, components: compMap };
    this._entities.set(id, entity);
    this.eventBus?.emit("ENTITY_CREATED", { id });
    return entity;
  }

  destroy(id) {
    if (this._entities.delete(id)) {
      this.eventBus?.emit("ENTITY_DESTROYED", { id });
    }
  }

  has(id) {
    return this._entities.has(id);
  }

  get(id) {
    return this._entities.get(id) || null;
  }

  getComponent(id, name) {
    return this._entities.get(id)?.components.get(name) ?? null;
  }

  setComponent(id, name, data) {
    const e = this._entities.get(id);
    if (!e) throw new Error(`[EntityRegistry] entidade "${id}" não existe`);
    e.components.set(name, data);
    this.eventBus?.emit("COMPONENT_CHANGED", { id, component: name, data });
  }

  removeComponent(id, name) {
    this._entities.get(id)?.components.delete(name);
  }

  // Retorna todas as entidades que possuem TODOS os componentes listados.
  query(...componentNames) {
    const out = [];
    for (const entity of this._entities.values()) {
      if (componentNames.every((c) => entity.components.has(c))) out.push(entity);
    }
    return out;
  }

  all() {
    return Array.from(this._entities.values());
  }

  clear() {
    this._entities.clear();
  }
}
