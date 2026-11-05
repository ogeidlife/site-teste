// interaction/types/PaintInteraction.js
// Implementa o contrato de handler exigido pelo InteractionSystem para o
// tipo "PAINT" (seções 5 e 6 do prompt: consumir sprays, tocar animação,
// trocar visual da parede de "before" pra "after", pontuar, disparar evento).
//
// Formato esperado de uma definição PAINT no Project JSON:
// {
//   id: "paint_wall_017",
//   type: "PAINT",
//   position: {x, y},
//   radius: 2.5,
//   requiredSprays: 3,
//   paintDuration: 3,          // segundos
//   animation: "painting",     // nome do estado de animação do personagem
//   before: { assetKey: "wall_017_before" },
//   after:  { assetKey: "wall_017_after" },
//   score: 100,
//   missionObjective: null,    // preenchido quando o MissionSystem existir (fase 3)
//   // "ON_PLAYER_PAINT" já é emitido automaticamente no finish() abaixo —
//   // events.onComplete é só para eventos EXTRAS que o criador configurar no
//   // editor (ex.: "SPAWN_GUARD", "PLAY_RADIO"), nunca repetir o mesmo aqui.
//   events: { onComplete: [] },
//   requiredPlayer: "ANY_PLAYER", // ANY_PLAYER | PLAYER_1 | PLAYER_2 | BOTH (fase de 2 jogadores)
// }
//
// worldState esperado (mínimo, fase 1): { inventory: { sprays: number },
//   paintedWalls: { [interactionId]: bool }, score: number, player: {...} }

export class PaintInteractionHandler {
  canStart(def, worldState) {
    if (worldState.paintedWalls[def.id]) return false; // já pintada
    const have = worldState.inventory?.sprays ?? 0;
    return have >= (def.requiredSprays ?? 1);
  }

  start(def, worldState, ctx) {
    // 1. consumir sprays já no início (regra do prompt: "consumir sprays" faz
    //    parte da execução da interação, não só no fim)
    worldState.inventory.sprays -= def.requiredSprays ?? 1;

    // 2. iniciar animação — quem realmente troca o clipe no personagem 3D é
    //    o Runtime (ele escuta este evento); o handler só avisa a intenção.
    ctx.eventBus.emit("ON_PLAYER_PAINT_START", {
      interactionId: def.id,
      animation: def.animation || "painting",
      position: def.position,
    });
  }

  update(def, worldState, dt, ctx, elapsed) {
    // sem lógica por frame além do timer (controlado pelo InteractionSystem
    // via "elapsed") — nada mais a fazer aqui na Fase 1.
  }

  isDone(def, worldState, elapsed) {
    return elapsed >= (def.paintDuration ?? 3);
  }

  finish(def, worldState, ctx) {
    // 3-8: alterar visual (before->after), registrar progresso, pontuar,
    // disparar eventos, atualizar missão (missão entra na fase 3).
    worldState.paintedWalls[def.id] = true;
    worldState.score = (worldState.score || 0) + (def.score ?? 0);

    ctx.eventBus.emit("ON_PLAYER_PAINT", {
      interactionId: def.id,
      afterAssetKey: def.after?.assetKey || null,
      score: def.score ?? 0,
      missionObjective: def.missionObjective || null,
    });

    (def.events?.onComplete || []).forEach((eventName) => {
      ctx.eventBus.emit(eventName, { interactionId: def.id });
    });
  }
}
