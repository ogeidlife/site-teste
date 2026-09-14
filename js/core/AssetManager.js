// AssetManager.js
// Fase 1: importar GLB, montar a Asset Library, detectar animações.
// Preserva materiais/texturas/rigs/animações do arquivo original (não faz
// nenhuma modificação no glTF — só instancia via SkeletonUtils quando o
// mesmo asset é colocado mais de uma vez no cenário).

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { BlobStore } from './BlobStore.js';
import { bus } from './EventBus.js';

function uid(prefix = 'asset') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export class AssetManager {
  constructor() {
    this.loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
    this.loader.setDRACOLoader(draco);

    // id -> { id, name, category, animations: [names], blobId, gltf (cache) }
    this.assets = new Map();
  }

  list() {
    return [...this.assets.values()];
  }

  get(id) {
    return this.assets.get(id);
  }

  /** Importa um arquivo GLB/GLTF selecionado pelo usuário (File API). */
  async importFile(file, category = 'PROPS') {
    const buffer = await file.arrayBuffer();
    const blob = new Blob([buffer], { type: file.type || 'model/gltf-binary' });
    const id = uid('asset');
    await BlobStore.put(id, blob);

    const gltf = await this._parseBlob(blob);
    const animations = gltf.animations.map((clip) => clip.name || 'clip');

    const entry = {
      id,
      name: file.name.replace(/\.(glb|gltf)$/i, ''),
      category,
      animations,
      blobId: id,
      gltf,
    };
    this.assets.set(id, entry);
    bus.emit('asset:imported', entry);
    return entry;
  }

  /** Recarrega a lib de assets a partir de referências salvas no projeto (blobId já no IndexedDB). */
  async hydrateFromProject(assetRefs = []) {
    for (const ref of assetRefs) {
      const blob = await BlobStore.get(ref.blobId);
      if (!blob) continue; // asset perdido (ex.: outro navegador) — fica ausente até reimportar
      const gltf = await this._parseBlob(blob);
      this.assets.set(ref.id, { ...ref, gltf });
    }
  }

  rename(id, name) {
    const a = this.assets.get(id);
    if (a) {
      a.name = name;
      bus.emit('asset:renamed', a);
    }
  }

  async remove(id) {
    this.assets.delete(id);
    await BlobStore.delete(id);
    bus.emit('asset:removed', id);
  }

  /** Cria uma instância nova (clone com skeleton correto) pronta pra por na cena. */
  createInstance(assetId) {
    const entry = this.assets.get(assetId);
    if (!entry || !entry.gltf) return null;
    const root = SkeletonUtils.clone(entry.gltf.scene);
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const mixer = entry.animations.length ? new THREE.AnimationMixer(root) : null;
    return { object3D: root, mixer, clips: entry.gltf.animations, assetId };
  }

  /** Referências leves (sem o gltf em memória) para salvar no project.json. */
  serializeLibrary() {
    return this.list().map(({ id, name, category, animations, blobId }) => ({
      id,
      name,
      category,
      animations,
      blobId,
    }));
  }

  _parseBlob(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      this.loader.load(
        url,
        (gltf) => {
          URL.revokeObjectURL(url);
          resolve(gltf);
        },
        undefined,
        (err) => {
          URL.revokeObjectURL(url);
          reject(err);
        }
      );
    });
  }
}
