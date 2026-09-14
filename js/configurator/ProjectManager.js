/**
 * ProjectManager.js
 * Serializa/desserializa o estado do mundo (SceneManager + referências de
 * assets) em um objeto de projeto no formato descrito no briefing (seção 17:
 * "SISTEMA DE JSON"). Persiste localmente via SaveSystem (IndexedDB) e
 * oferece Export/Import de arquivo .json para backup ou compartilhamento.
 *
 * IMPORTANTE sobre portabilidade: o binário dos GLB fica no IndexedDB do
 * navegador (chave = assetId), NÃO dentro do project.json (ficaria pesado
 * demais). Ao importar um project.json em outro navegador/sessão, os GLBs
 * referenciados precisam existir na Asset Library local — o sistema tenta
 * casar por nome automaticamente e avisa quais faltam reimportar.
 */

import { uuid, downloadJSON, readFileAsText } from '../core/Utils.js';
import { bus } from '../core/EventBus.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { SceneManager } from '../systems/SceneManager.js';
import { AssetManager } from '../systems/AssetManager.js';

const AUTOSAVE_ID = 'autosave';
const PROJECT_JSON_VERSION = 1;

class ProjectManagerImpl {
  constructor() {
    this.currentProjectId = null;
    this.currentProjectName = 'Novo Projeto';
    this._autosaveTimer = null;
  }

  init() {
    ['scene:objectAdded', 'scene:objectRemoved', 'scene:objectRenamed', 'transform:changed', 'asset:imported']
      .forEach((evt) => bus.on(evt, () => this._scheduleAutosave()));
  }

  _scheduleAutosave() {
    clearTimeout(this._autosaveTimer);
    this._autosaveTimer = setTimeout(() => this.save({ silent: true, id: AUTOSAVE_ID, name: '(autosave)' }), 900);
  }

  /** Monta o objeto de projeto (formato project.json) a partir do estado atual. */
  serialize() {
    const sceneObjects = SceneManager.getAllEntries().map((entry) => ({
      id: entry.id,
      name: entry.name,
      layer: entry.layer,
      assetId: entry.assetId,
      assetName: AssetManager.getAsset(entry.assetId)?.name ?? null,
      collision: entry.collision,
      position: entry.object3D.position.toArray(),
      rotation: entry.object3D.rotation.toArray().slice(0, 3),
      scale: entry.object3D.scale.toArray(),
    }));

    const assets = AssetManager.getAll().map((a) => ({ id: a.id, name: a.name, sizeBytes: a.sizeBytes }));

    return {
      version: PROJECT_JSON_VERSION,
      id: this.currentProjectId || uuid(),
      name: this.currentProjectName,
      updatedAt: Date.now(),

      // Estrutura alinhada ao briefing: scene / assets / player / NPCs /
      // guards / cameras / walls / graffiti / items / missions / lights / ui.
      // Fase 1 preenche scene + assets; os demais ficam como placeholders
      // prontos para as próximas fases lerem/gravarem.
      scene: { objects: sceneObjects },
      assets,
      player: {},
      npcs: [],
      guards: [],
      cameras: [],
      walls: [],
      graffitiSpots: [],
      items: [],
      missions: [],
      lights: [],
      ui: {},
      gameplay: {},
    };
  }

  async save({ silent = false, id = null, name = null } = {}) {
    const project = this.serialize();
    project.id = id || this.currentProjectId || uuid();
    project.name = name || this.currentProjectName;

    await SaveSystem.putProject(project);
    SaveSystem.autosave(project);

    if (project.id !== AUTOSAVE_ID) {
      this.currentProjectId = project.id;
      this.currentProjectName = project.name;
      SaveSystem.setLastProjectId(project.id);
    }

    if (!silent) bus.emit('project:saved', project);
    return project;
  }

  async saveAs() {
    const name = prompt('Nome do projeto:', this.currentProjectName || 'Meu Projeto');
    if (!name) return null;
    this.currentProjectId = uuid();
    this.currentProjectName = name;
    return this.save({ name });
  }

  async newProject() {
    if (!confirm('Criar um novo projeto? Alterações não salvas no projeto atual serão perdidas.')) return;
    SceneManager.clearWorldObjects();
    this.currentProjectId = uuid();
    this.currentProjectName = 'Novo Projeto';
    bus.emit('project:new');
    await this.save({ silent: true });
  }

  async loadProjectById(id) {
    const project = await SaveSystem.getProject(id);
    if (!project) {
      alert('Projeto não encontrado.');
      return;
    }
    this._applyProject(project);
  }

  async loadLastOrAutosave() {
    const lastId = SaveSystem.getLastProjectId();
    let project = lastId ? await SaveSystem.getProject(lastId) : null;
    if (!project) project = await SaveSystem.getProject(AUTOSAVE_ID);
    if (project) this._applyProject(project);
    return project;
  }

  _applyProject(project) {
    SceneManager.clearWorldObjects();
    this.currentProjectId = project.id === AUTOSAVE_ID ? uuid() : project.id;
    this.currentProjectName = project.name;

    const missingAssets = [];
    for (const obj of project.scene?.objects || []) {
      let record = obj.assetId ? AssetManager.getAsset(obj.assetId) : null;
      if (!record && obj.assetName) {
        record = AssetManager.getAll().find((a) => a.name === obj.assetName) || null;
      }
      if (!record) {
        missingAssets.push(obj.assetName || obj.assetId || obj.name);
        continue;
      }

      const object3D = AssetManager.createInstance(record.id);
      object3D.position.fromArray(obj.position);
      object3D.rotation.fromArray(obj.rotation);
      object3D.scale.fromArray(obj.scale);
      SceneManager.addObject(object3D, {
        id: obj.id,
        name: obj.name,
        layer: obj.layer,
        assetId: record.id,
        collision: obj.collision,
      });
    }

    bus.emit('project:loaded', project);

    if (missingAssets.length) {
      alert(
        `Projeto carregado, mas ${missingAssets.length} objeto(s) usam GLBs que não estão na biblioteca local:\n\n` +
          missingAssets.join('\n') +
          '\n\nImporte esses arquivos em "+ IMPORTAR GLB" e carregue o projeto novamente.'
      );
    }
  }

  exportJSON() {
    const project = this.serialize();
    downloadJSON(project, `${(project.name || 'project').replace(/\s+/g, '_')}.json`);
  }

  async importJSON(file) {
    const text = await readFileAsText(file);
    let project;
    try {
      project = JSON.parse(text);
    } catch (err) {
      alert('Arquivo JSON inválido.');
      return;
    }
    this._applyProject(project);
    await this.save({ silent: true, id: project.id, name: project.name });
  }

  async reset() {
    if (!confirm('Isso apaga TODOS os objetos do mapa atual (assets importados são mantidos). Continuar?')) return;
    SceneManager.clearWorldObjects();
    await this.save({ silent: true });
  }

  async listProjects() {
    const all = await SaveSystem.getAllProjects();
    return all.filter((p) => p.id !== AUTOSAVE_ID);
  }
}

export const ProjectManager = new ProjectManagerImpl();
