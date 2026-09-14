// GraffitiSystem.js — FASE 5 (a implementar)
// Cada GRAFFITI SPOT (project.graffitiSpots[i]) guarda wallAssetId,
// emptyState/paintedState, textureUrl, animation, e (arquitetura já
// reservada) paintingVideo/completionVideo/missionId/requiredItem/sprayCost.
// Ao completar: troca o estado do objeto (ver WorldStateManager) de
// EMPTY -> PAINTED sem duplicar o objeto no mapa (item 26 do spec de narrativa).
export class GraffitiSystem {
  constructor(spots, worldStateManager) {
    this.spots = spots;
    this.worldStateManager = worldStateManager;
  }
  paint(spotId) {
    // TODO Fase 5: animação SPRAYING -> worldStateManager.setState(spotId, 'PAINTED')
  }
}
