// CinematicCamera.js — câmera temporária durante vídeos/eventos (a implementar).
// Fluxo previsto: GAMEPLAY CAMERA -> CINEMATIC CAMERA -> (vídeo/evento) ->
// GAMEPLAY CAMERA. Deve conseguir interpolar (lerp/slerp) de onde a
// CameraController.js estava para uma posição/alvo fixos configurados no
// trigger ou no evento, e devolver o controle suavemente ao final.
export class CinematicCamera {
  constructor(camera) {
    this.camera = camera;
  }
  playTo(targetPosition, lookAt, duration) {
    // TODO
  }
}
