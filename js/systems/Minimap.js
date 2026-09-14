// Minimap.js — FASE 8 (a implementar)
// Desenha player, guards, câmeras, objetivos e áreas importantes em um
// <canvas> 2D visto de cima, usando as mesmas posições X/Z da cena 3D.
export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }
  render({ player, guards = [], cameras = [], objectives = [] }) {
    // TODO Fase 8
  }
}
