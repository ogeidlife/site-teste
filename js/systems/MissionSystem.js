// MissionSystem.js — FASE 6 (a implementar)
// Roda project.missions[i]: { id, name, objectives:[{id,name,description,
// type,position,condition,reward}], videoIntro }.
// Tipos de objetivo previstos: GO_TO, COLLECT, PAINT, ESCAPE, RETURN,
// INTERACT, SURVIVE, AVOID_DETECTION.
// Emite "mission:objectiveCompleted" / "mission:completed" / "mission:failed"
// no EventBus — é isso que o NarrativeSystem (vídeos de intro/conclusão)
// e o MissionPanel do HUD vão escutar.
export class MissionSystem {
  constructor(missions) {
    this.missions = missions;
    this.active = null;
  }
  start(missionId) {
    // TODO Fase 6
  }
  update(dt) {
    // TODO Fase 6
  }
}
