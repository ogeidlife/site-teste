// ProjectManager.js
// Fonte única de verdade do projeto. O JSON aqui já reserva espaço pra TODAS
// as fases futuras (guards, cameras, missions, videos, triggers, worldState...)
// mesmo que a Fase 1 só preencha "assets" e "objects" de fato. Isso evita ter
// que migrar o formato depois — cada fase só passa a LER/ESCREVER a sua chave.
//
// Persistência local: chave única no localStorage ("ogeid_project_v1").
// Binários (GLB) ficam no IndexedDB via BlobStore, referenciados por id.

import { bus } from './EventBus.js';

const STORAGE_KEY = 'ogeid_project_v1';
const SCHEMA_VERSION = 1;

export function createEmptyProject(name = 'Untitled Project') {
  return {
    meta: {
      name,
      schemaVersion: SCHEMA_VERSION,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    },

    // --- FASE 1 (ativo) ---
    scene: {
      grid: { size: 60, divisions: 60, snap: true, snapSize: 1 },
      fog: { color: 0x0a0b0d, density: 0.018 },
      ambient: { color: 0x38405a, intensity: 0.55 },
      directional: { color: 0x6f86ff, intensity: 0.5, position: [-10, 20, -6] },
    },
    assets: [], // biblioteca de GLBs importados: {id,name,category,animations,blobId}
    objects: [], // objetos colocados no mapa: {id,name,assetId,category,position,rotation,scale,collision,properties}

    // --- FASE 2 ---
    player: {
      name: 'OGEID',
      assetId: null,
      scale: 1,
      speed: 4,
      runSpeed: 7,
      acceleration: 12,
      rotationSpeed: 10,
      animations: { idle: 'Idle', walk: 'Walk', run: 'Run', spray: 'Spray' },
      controls: { move: 'WASD', run: 'Shift', interact: 'E', action: 'Space' },
    },
    camera: {
      mode: 'isometric', // isometric | topdown | thirdperson
      height: 14,
      distance: 16,
      angle: 45,
      smoothing: 0.1,
      followSpeed: 6,
      zoomMin: 8,
      zoomMax: 26,
    },

    // --- FASE 3/4 ---
    guards: [], // {id,name,assetId,speed,visionDistance,visionAngle,reactionTime,waypoints:[],initialState}
    securityCameras: [], // {id,name,position,rotation,fov,detectionDistance,rotationSpeed,patrolAngle,mode}

    // --- FASE 5 ---
    graffitiSpots: [], // {id,name,wallAssetId,emptyState,paintedState,textureUrl,animation,paintingVideo,completionVideo,missionId,requiredItem,sprayCost,reward}

    // --- FASE 6 ---
    missions: [], // {id,name,objectives:[{id,name,description,type,position,condition,reward}],videoIntro}

    // --- FASE 7 ---
    items: [], // {id,name,assetId,icon,quantity,position,collectable}

    // --- FASE 8 (UI) ---
    ui: {
      hp: true, energy: true, xp: true, missionPanel: true,
      minimap: true, inventory: true, cameraFeed: true,
      layout: {}, // posição/tamanho/opacidade por elemento, preenchido pelo UIEditor
    },

    lights: [], // luzes adicionais criadas no mapa: {id,type,position,color,intensity,distance,decay,castShadow}
    gameplay: {}, // regras gerais (ex.: consequência de detecção: MISSION_FAILED | PLAYER_DETECTED)

    // --- Narrativa / vídeos / estado do mundo (arquitetura reservada) ---
    videos: [], // {id,name,file,type,duration,skippable,volume,fade,trigger,actionAfter}
    triggers: [], // {id,type,position,size,triggerEvent,action,payload}
    worldState: {}, // {objectId: {state:"PAINTED", ...}} — persistência de transformações permanentes
  };
}

export class ProjectManager {
  constructor() {
    this.project = createEmptyProject();
  }

  newProject(name) {
    this.project = createEmptyProject(name);
    bus.emit('project:changed', this.project);
    return this.project;
  }

  touch() {
    this.project.meta.updated = new Date().toISOString();
  }

  save() {
    this.touch();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.project));
    bus.emit('project:saved', this.project);
  }

  hasSavedProject() {
    return !!localStorage.getItem(STORAGE_KEY);
  }

  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    this.project = { ...createEmptyProject(), ...JSON.parse(raw) };
    bus.emit('project:changed', this.project);
    return this.project;
  }

  exportJSON() {
    this.touch();
    const blob = new Blob([JSON.stringify(this.project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.project.meta.name.replace(/\s+/g, '_') || 'project'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importJSON(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    this.project = { ...createEmptyProject(), ...parsed };
    bus.emit('project:changed', this.project);
    return this.project;
  }

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.newProject();
  }
}
