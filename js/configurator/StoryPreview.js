// StoryPreview.js — botão "▶ PREVIEW STORY" (a implementar).
// Roda a sequência narrativa configurada (intro -> vídeo de missão ->
// interação -> pintura -> transformação -> vídeo de conclusão) sem precisar
// jogar a missão inteira — útil pra testar timing de vídeos/eventos rápido.
// Reaproveita o EventSystem.js do jogo rodando dentro do próprio configurador,
// num overlay temporário sobre a viewport de edição.
export class StoryPreview {
  constructor({ sceneManager, projectManager }) {
    this.sceneManager = sceneManager;
    this.projectManager = projectManager;
  }
  run(missionId) {
    // TODO
  }
}
