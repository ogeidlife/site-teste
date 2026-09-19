// project/schema.js
// Formato do "Project JSON" do OGEID STUDIO. Este é o ÚNICO lugar onde regra
// de mapa deveria "morar" — o Runtime só interpreta isto, nunca tem lógica
// específica de fase amarrada no código (ver seção 2 do prompt do usuário).
//
// PROJECT_VERSION existe para o Validator/Loader saberem migrar projetos
// antigos quando o schema mudar nas próximas fases.

export const PROJECT_VERSION = 1;

export function createEmptyProject() {
  return {
    meta: {
      version: PROJECT_VERSION,
      name: "Novo Projeto OGEID",
      createdAt: new Date().toISOString(),
    },

    // Referências de assets usadas pelo projeto (chave -> descrição do asset).
    // O binário em si vive no AssetManager (IndexedDB); aqui só ficam as
    // chaves para o Validator conseguir checar "essa chave existe?".
    assets: {
      // "wall_017_before": { type: "image"|"model3d", label: "..." }
    },

    world: {
      map: {
        width: 100,
        height: 100,
        backgroundAssetKey: null,
      },
      areas: [
        // { id, type: "PUBLIC"|"PRIVATE"|"RESTRICTED"|"HIGH_SECURITY"|"MISSION_ONLY"|"SAFE_ZONE", bounds:{x,y,w,h}, guardCount, wantedLevel, events:[] }
      ],
    },

    // Entidades do mundo (paredes, prédios, spawners, etc.)
    entities: [
      // { id, type: "WALL"|"BUILDING"|"PROP", transform:{x,y,z,rotY,scale}, interactions: ["paint_017"] }
    ],

    // InteractionSystem: TODA interação possível no jogo é um item aqui.
    interactions: [
      // ver interaction/types/PaintInteraction.js para o formato de uma PAINT
    ],

    traversal: { nodes: [], edges: [] }, // Fase 2+

    guards: [],       // Fase 2+ (GuardSystem)
    wantedLevels: [   // WantedSystem — já com o default de exemplo do prompt, mas 100% configurável
      { level: 0, name: "desconhecido", color: "#7CFF3C" },
      { level: 1, name: "atenção", color: "#ffe14d" },
      { level: 2, name: "reconhecido", color: "#ff9a3c" },
      { level: 3, name: "procurado", color: "#ff2f92" },
      { level: 4, name: "alta prioridade", color: "#ff2f2f" },
      { level: 5, name: "cidade em alerta", color: "#ffffff" },
    ],
    missions: [],     // Fase 3+ (MissionSystem)
    rules: [],        // Fase 3+ (Rule Editor: condição+condição -> ação+ação)

    players: {
      count: 1,
      controls: {},
    },
    minigames: [],    // Fase 4+
  };
}

// Faz merge raso de um projeto carregado com os defaults acima, garantindo
// que campos novos de fases futuras sempre existam mesmo em projetos antigos.
export function withDefaults(loadedProject) {
  const base = createEmptyProject();
  return deepMergeDefaults(base, loadedProject || {});
}

function deepMergeDefaults(base, loaded) {
  if (Array.isArray(base)) return Array.isArray(loaded) ? loaded : base;
  if (typeof base !== "object" || base === null) return loaded ?? base;

  const out = { ...base };
  for (const key of Object.keys(base)) {
    if (loaded && Object.prototype.hasOwnProperty.call(loaded, key)) {
      out[key] = deepMergeDefaults(base[key], loaded[key]);
    }
  }
  // preserva chaves extras que o projeto carregado tenha e o schema não preveja
  if (loaded && typeof loaded === "object" && !Array.isArray(loaded)) {
    for (const key of Object.keys(loaded)) {
      if (!(key in out)) out[key] = loaded[key];
    }
  }
  return out;
}
