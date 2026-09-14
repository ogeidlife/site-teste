// DebugSystem.js — hoje o overlay de debug (F3) vive inline em game/main.js.
// Quando Guard AI / Missions / Detection existirem, extrair pra cá: FPS,
// posição/rotação do player, missão e objetivo atuais, estado dos guardas,
// detecção de câmeras, e desenho visual de collision boxes / cones de visão /
// waypoints / pontos de missão / áreas de graffiti (item 19 do spec).
export class DebugSystem {
  constructor(scene) {
    this.scene = scene;
    this.enabled = false;
  }
  toggle() {
    this.enabled = !this.enabled;
  }
}
