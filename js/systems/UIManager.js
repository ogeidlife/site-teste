// UIManager.js — FASE 8 (a implementar)
// Vai renderizar o HUD completo a partir de project.ui: { hp, energy, xp,
// missionPanel, minimap, inventory, cameraFeed, layout:{} }. O game/main.js
// hoje desenha um HUD mínimo direto no HTML — este módulo vai substituir
// isso por componentes configuráveis (posição/tamanho/opacidade por elemento,
// lidos de project.ui.layout, editados pelo futuro UIEditor.js do configurador).
export class UIManager {
  constructor(container, uiConfig) {
    this.container = container;
    this.uiConfig = uiConfig;
  }
  render(state) {
    // TODO Fase 8
  }
}
