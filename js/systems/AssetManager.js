/**
 * AssetManager.js
 * Responsável por tudo relacionado a modelos GLB/GLTF:
 *  - importar arquivos do disco do usuário
 *  - fazer parse com GLTFLoader
 *  - manter uma biblioteca em memória (registry) com metadados
 *  - persistir o binário no IndexedDB (via SaveSystem) para sobreviver a reloads
 *  - fornecer clones prontos para uso na cena (preservando skinning/animações)
 *
 * Este módulo é usado tanto pelo configurador quanto (nas próximas fases)
 * pelo jogo em si — por isso não depende de nada de UI.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { bus } from '../core/EventBus.js';
import { uuid } from '../core/Utils.js';
import { SaveSystem } from './SaveSystem.js';

const loader = new GLTFLoader();

class AssetManagerImpl {
  constructor() {
    /** @type {Map<string, AssetRecord>} */
    this.registry = new Map();
  }

  /**
   * Importa um arquivo GLB/GLTF escolhido pelo usuário.
   * @param {File} file
   * @returns {Promise<AssetRecord>}
   */
  async importFromFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const id = uuid();
    const name = file.name.replace(/\.(glb|gltf)$/i, '');
    const record = await this._buildRecord(id, name, arrayBuffer, file.type || 'model/gltf-binary');

    // Persiste o binário no IndexedDB para que o projeto sobreviva a reloads
    // sem exigir reimportação manual do arquivo.
    await SaveSystem.putAsset({
      id,
      name,
      mime: record.mime,
      data: arrayBuffer,
      createdAt: Date.now(),
    });

    bus.emit('asset:imported', record);
    return record;
  }

  /**
   * Recarrega todos os assets previamente salvos no IndexedDB.
   * Chamado na inicialização para restaurar a biblioteca entre sessões.
   */
  async hydrateFromDB() {
    const stored = await SaveSystem.getAllAssets();
    for (const item of stored) {
      try {
        const record = await this._buildRecord(item.id, item.name, item.data, item.mime);
        bus.emit('asset:imported', record);
      } catch (err) {
        console.error(`[AssetManager] falha ao restaurar asset "${item.name}"`, err);
      }
    }
    return [...this.registry.values()];
  }

  async _buildRecord(id, name, arrayBuffer, mime) {
    const gltf = await new Promise((resolve, reject) => {
      loader.parse(arrayBuffer, '', resolve, reject);
    });

    const blob = new Blob([arrayBuffer], { type: mime || 'model/gltf-binary' });
    const objectURL = URL.createObjectURL(blob);

    // Normaliza sombras nos meshes do template (as instâncias herdam via clone).
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const animations = (gltf.animations || []).map((clip) => clip.name);

    const record = {
      id,
      name,
      mime: mime || 'model/gltf-binary',
      objectURL,
      sizeBytes: arrayBuffer.byteLength,
      gltf,          // template original — nunca inserir direto na cena, sempre clonar
      animations,    // nomes das animation clips detectadas no GLB
    };

    this.registry.set(id, record);
    return record;
  }

  getAsset(id) {
    return this.registry.get(id) || null;
  }

  getAll() {
    return [...this.registry.values()];
  }

  rename(id, newName) {
    const record = this.registry.get(id);
    if (!record) return;
    record.name = newName;
    bus.emit('asset:renamed', record);
  }

  async remove(id) {
    const record = this.registry.get(id);
    if (!record) return;
    URL.revokeObjectURL(record.objectURL);
    this.registry.delete(id);
    await SaveSystem.deleteAsset(id);
    bus.emit('asset:removed', id);
  }

  /**
   * Cria uma instância (clone) pronta para ser adicionada à cena.
   * Usa SkeletonUtils.clone para preservar corretamente skinning/rig,
   * o que new THREE.Object3D().clone() nativo não garante para SkinnedMesh.
   */
  createInstance(assetId) {
    const record = this.registry.get(assetId);
    if (!record) throw new Error(`Asset "${assetId}" não encontrado na biblioteca.`);

    const object = cloneSkeleton(record.gltf.scene);
    object.userData.assetId = assetId;
    object.userData.assetName = record.name;

    let mixer = null;
    if (record.gltf.animations && record.gltf.animations.length) {
      mixer = new THREE.AnimationMixer(object);
      object.userData.animationClips = record.gltf.animations;
      object.userData.mixer = mixer;
    }

    return object;
  }
}

export const AssetManager = new AssetManagerImpl();
