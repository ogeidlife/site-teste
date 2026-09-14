// GuardAI.js — FASE 3 (a implementar)
// Vai controlar cada objeto da categoria SEGURANÇA a partir de
// project.guards[i]: { id, assetId, speed, visionDistance, visionAngle,
// reactionTime, waypoints:[{x,y,z}], initialState }.
// Máquina de estados prevista: IDLE -> PATROL -> SUSPICIOUS -> ALERT -> CHASE -> RETURN.
// Vai emitir eventos no EventBus ("guard:stateChanged", "guard:playerDetected")
// para o HUD, o DebugSystem e o futuro NarrativeSystem reagirem sem acoplamento direto.
export class GuardAI {
  constructor(config) {
    this.config = config;
    this.state = config.initialState || 'IDLE';
    // TODO Fase 3: waypoint following, cone de visão, barra de detecção 0-100%.
  }
  update(dt, playerPosition) {
    // TODO Fase 3
  }
}
