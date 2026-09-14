// CameraController.js (Fase 2)
// Câmera isométrica/top-down que segue o player. Lê as configurações do
// project.json (camera: height/distance/angle/smoothing/followSpeed/zoom)
// — nada disso está fixo no código, dá pra reconfigurar tudo no Configurador
// (painel CÂMERA DO JOGO) e o game.html reflete sem editar JS.

import * as THREE from 'three';

export class CameraController {
  constructor({ camera, config }) {
    this.camera = camera;
    this.config = config; // { mode, height, distance, angle, smoothing, followSpeed, zoomMin, zoomMax }
    this.zoom = config.distance;
    this._targetPos = new THREE.Vector3();
    this._desired = new THREE.Vector3();
  }

  setMode(mode) {
    this.config.mode = mode;
  }

  handleWheel(deltaY) {
    this.zoom = THREE.MathUtils.clamp(this.zoom + deltaY * 0.01, this.config.zoomMin, this.config.zoomMax);
  }

  update(playerPosition, dt) {
    const { height, angle, followSpeed, mode } = this.config;
    const angleRad = THREE.MathUtils.degToRad(angle);

    if (mode === 'topdown') {
      this._desired.set(playerPosition.x, height + this.zoom, playerPosition.z + 0.01);
    } else if (mode === 'thirdperson') {
      const back = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0);
      this._desired.set(playerPosition.x, playerPosition.y + 3, playerPosition.z + this.zoom * 0.6);
    } else {
      // isometric (padrão)
      this._desired.set(
        playerPosition.x + Math.cos(angleRad) * this.zoom,
        playerPosition.y + height * (this.zoom / this.config.distance),
        playerPosition.z + Math.sin(angleRad) * this.zoom
      );
    }

    this.camera.position.lerp(this._desired, 1 - Math.pow(0.001, dt * followSpeed * 0.2 + 0.05));
    this._targetPos.copy(playerPosition).add(new THREE.Vector3(0, 1, 0));
    this.camera.lookAt(this._targetPos);
  }
}
