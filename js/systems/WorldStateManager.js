// WorldStateManager.js — persistência de transformações permanentes do mundo
// (a implementar; a estrutura já existe em project.worldState).
// Formato: { [objectId]: { state: 'PAINTED' | 'OPEN' | ... } }.
// Regra fundamental do spec: NÃO duplicar o mapa por estado — cada objeto tem
// N estados possíveis (ex.: WALL: EMPTY/SKETCH/HALF_PAINTED/PAINTED/DAMAGED),
// e trocar de estado troca o asset/visual do MESMO objeto (before/after),
// nunca cria uma cópia da cena. O save (SAVE GAME) grava este objeto inteiro;
// o load reaplica cada estado salvo antes de liberar o gameplay.
export class WorldStateManager {
  constructor(initialState = {}) {
    this.state = { ...initialState };
  }
  getState(objectId) {
    return this.state[objectId]?.state || null;
  }
  setState(objectId, state) {
    this.state[objectId] = { ...(this.state[objectId] || {}), state };
    // TODO: bus.emit('worldState:changed', {objectId, state}) + trocar visual (before/after)
  }
  serialize() {
    return this.state;
  }
}
