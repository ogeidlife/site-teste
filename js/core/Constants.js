/**
 * Constants.js
 * Valores compartilhados por todo o projeto. Mantidos aqui para evitar
 * strings mágicas espalhadas pelo código — mudar um nome aqui atualiza
 * o projeto inteiro.
 */

// Categorias do painel esquerdo do configurador (OGEID GAME CONFIGURATOR).
// Cada categoria terá seu próprio painel de ferramentas. Nas fases futuras,
// cada uma ganha um módulo dedicado (GuardEditor, MissionEditor, etc).
export const CATEGORIES = [
  { id: 'cenario', label: 'CENÁRIO', phase: 1 },
  { id: 'personagem', label: 'PERSONAGEM', phase: 2 },
  { id: 'npc', label: 'NPC', phase: 3 },
  { id: 'seguranca', label: 'SEGURANÇA', phase: 3 },
  { id: 'cameras', label: 'CÂMERAS', phase: 4 },
  { id: 'objetos', label: 'OBJETOS', phase: 1 },
  { id: 'muros', label: 'MUROS', phase: 5 },
  { id: 'graffiti', label: 'GRAFFITI', phase: 5 },
  { id: 'missoes', label: 'MISSÕES', phase: 6 },
  { id: 'itens', label: 'ITENS', phase: 7 },
  { id: 'audio', label: 'ÁUDIO', phase: 8 },
  { id: 'videos', label: 'VÍDEOS', phase: 8 },
  { id: 'interface', label: 'INTERFACE', phase: 8 },
  { id: 'iluminacao', label: 'ILUMINAÇÃO', phase: 1 },
  { id: 'gameplay', label: 'GAMEPLAY', phase: 9 },
];

// Layers usadas para organizar e filtrar objetos na cena (visibilidade,
// seleção em massa, futura serialização em missions/scene).
export const LAYERS = ['GROUND', 'BUILDINGS', 'PROPS', 'NPC', 'LIGHTS', 'GAMEPLAY'];

// Chaves usadas no IndexedDB / localStorage.
export const DB_NAME = 'ogeid-game-db';
export const DB_VERSION = 1;
export const STORE_ASSETS = 'assets';   // blobs binários dos GLB
export const STORE_PROJECTS = 'projects'; // snapshots de projeto (JSON)
export const LS_LAST_PROJECT = 'ogeid:lastProjectId';
export const LS_AUTOSAVE_KEY = 'ogeid:autosave';

export const GRID_SIZE = 50;
export const GRID_DIVISIONS = 50;
export const DEFAULT_SNAP = 0.5;

export const TRANSFORM_MODES = ['translate', 'rotate', 'scale'];
