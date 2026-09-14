// EventSystem.js — sistema de narrativa (a implementar)
// Executa "cadeias de eventos" configuradas no EVENT SEQUENCE EDITOR:
// [{type:'PLAY_VIDEO',...}, {type:'WAIT',seconds:2}, {type:'SPAWN_GUARD',...},
//  {type:'ENABLE_OBJECTIVE',...}, {type:'CHANGE_OBJECT_STATE',...}].
// Roda os passos em sequência (await entre eles), delegando cada tipo de passo
// pro sistema responsável (VideoManager, GuardAI, WorldStateManager, MissionSystem)
// via EventBus — este módulo não conhece a implementação de cada um, só orquestra a ordem.
export class EventSystem {
  constructor(bus) {
    this.bus = bus;
  }
  async run(sequence = []) {
    // TODO: for-await sequencial, cada step emite um evento e espera confirmação
  }
}
