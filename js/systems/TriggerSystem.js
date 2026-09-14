// TriggerSystem.js — sistema de narrativa (a implementar)
// project.triggers[i]: { id, type, position, size, triggerEvent, action, payload }.
// triggerEvent previstos: PLAYER_ENTER, PLAYER_EXIT, ON_INTERACT, ON_MISSION_START,
// ON_MISSION_COMPLETE, ON_PLAYER_DETECTED, ON_OBJECT_COLLECTED, ON_TIMER.
// action previstos: PLAY_VIDEO, UNLOCK_DOOR, CHANGE_OBJECT_STATE, START_MISSION,
// SPAWN_NPC, ENABLE_OBJECTIVE, CUSTOM_EVENT.
// Cada trigger é uma caixa invisível (Box3) checada contra a posição do player
// a cada frame — mesmo princípio de caixas do CollisionSystem.js.
export class TriggerSystem {
  constructor(triggers = []) {
    this.triggers = triggers;
    this.firedOnce = new Set();
  }
  update(playerPosition) {
    // TODO: checar player dentro/fora de cada trigger e emitir bus.emit('trigger:fired', trigger)
  }
}
