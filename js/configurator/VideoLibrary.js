// VideoLibrary.js — sistema de narrativa (a implementar)
// Aba "VÍDEOS" do configurador: biblioteca de project.videos agrupada por tipo
// (INTRO, MISSION INTRO/COMPLETE/FAILED, PLAYER DETECTED, WORLD EVENT,
// INTERACTION, DIALOGUE, LOCATION INTRO, ENDING, CUSTOM). Botão "+ IMPORT
// VIDEO" salva o MP4/WEBM no BlobStore (mesmo padrão do AssetManager de GLB)
// e cria a entrada { id, name, file(blobId), type, duration, skippable,
// volume, fade, trigger, actionAfter }.
export class VideoLibrary {
  constructor({ container, projectManager }) {
    this.container = container;
    this.projectManager = projectManager;
  }
  render() {
    // TODO
  }
}
