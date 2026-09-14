// SecurityCamera.js — FASE 4 (a implementar)
// Lê project.securityCameras[i]: { position, rotation, fov, detectionDistance,
// rotationSpeed, patrolAngle, mode: 'FIXED'|'ROTATING' }.
// No Configurador, o cone de visão já pode ser desenhado com um THREE.ConeGeometry
// semi-transparente reaproveitando o mesmo SceneManager da Fase 1 (ver
// item 9 do spec — janela de monitoramento CAMERA 0X entra junto com o VideoManager).
export class SecurityCamera {
  constructor(config) {
    this.config = config;
  }
  update(dt, playerPosition) {
    // TODO Fase 4
  }
}
