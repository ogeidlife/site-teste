// NarrativeSystem.js — orquestra GAMEPLAY + NARRATIVE + WORLD STATE juntos
// (a implementar). É a camada que decide, por exemplo: jogador entra na área
// -> TriggerSystem dispara -> VideoManager toca mission_01_intro.mp4 ->
// MissionSystem ativa o objetivo -> jogador pinta -> GraffitiSystem troca o
// estado via WorldStateManager -> VideoManager toca mission_01_complete.mp4.
// Pensado desde já como sistema GENÉRICO (não hardcoded pra "missão 1"),
// para ser reaproveitado em dezenas de missões/mapas, como pedido no spec.
export class NarrativeSystem {
  constructor({ videoManager, triggerSystem, missionSystem, worldStateManager, eventSystem }) {
    Object.assign(this, { videoManager, triggerSystem, missionSystem, worldStateManager, eventSystem });
  }
  update(dt, playerPosition) {
    // TODO: liga TriggerSystem.update() aos handlers de vídeo/evento/missão
  }
}
