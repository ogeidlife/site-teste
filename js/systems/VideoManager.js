// VideoManager.js — sistema de narrativa (a implementar)
// Reproduz .mp4/.webm a partir de project.videos[i]: { id, name, file, type,
// duration, skippable, volume, fade, trigger, actionAfter }. Dois modos
// previstos: FULLSCREEN VIDEO (overlay <video> em tela cheia com fade in/out
// e botão SKIP configurável) e IN-WORLD VIDEO (textura de vídeo aplicada a um
// material, pra TVs/monitores/outdoors dentro do cenário — usa
// THREE.VideoTexture). Os binários MP4 seguem o mesmo padrão dos GLBs:
// ficam no BlobStore (IndexedDB), o project.json só guarda o id/nome.
export class VideoManager {
  constructor({ overlayRoot }) {
    this.overlayRoot = overlayRoot;
    this.queue = [];
  }
  play(videoConfig, { onComplete } = {}) {
    // TODO: fade in -> <video> fullscreen ou VideoTexture in-world -> fade out -> onComplete()
  }
  skip() {
    // TODO
  }
}
