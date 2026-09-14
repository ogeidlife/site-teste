// main.js (configurador)
// Bootstrap da Fase 1: monta o layout (topbar, painel esquerdo, viewport,
// painel direito, status bar), cria a cena de demonstração na primeira vez
// que o app abre, e liga tudo via EventBus + ProjectManager.

import * as THREE from 'three';
import { bus } from '../core/EventBus.js';
import { SceneManager } from '../core/SceneManager.js';
import { AssetManager } from '../core/AssetManager.js';
import { ProjectManager } from '../core/ProjectManager.js';
import { AssetLibrary } from './AssetLibrary.js';
import { Inspector } from './Inspector.js';
import { TransformGizmo } from './TransformGizmo.js';
import { placePrimitive, serializeObjects, deserializeObjects } from './SceneObjectFactory.js';

const CATEGORIES = [
  'CENÁRIO','PERSONAGEM','NPC','SEGURANÇA','CÂMERAS','OBJETOS','MUROS',
  'GRAFFITI','MISSÕES','ITENS','ÁUDIO','VÍDEOS','INTERFACE','ILUMINAÇÃO','GAMEPLAY',
];

// o que cada categoria adiciona ao clicar em "ADD" (Fase 1: primitivas placeholder;
// nas próximas fases cada uma ganha seu próprio editor dedicado)
const CATEGORY_ADD = {
  'CENÁRIO': { kind: 'PLANE', label: '+ ADD GROUND PATCH' },
  'PERSONAGEM': { kind: 'CAPSULE', label: '+ ADD PLAYER PLACEHOLDER' },
  'NPC': { kind: 'CAPSULE', label: '+ ADD NPC PLACEHOLDER' },
  'SEGURANÇA': { kind: 'CAPSULE', label: '+ ADD GUARD PLACEHOLDER' },
  'CÂMERAS': { kind: 'SPHERE', label: '+ ADD CAMERA PLACEHOLDER' },
  'OBJETOS': { kind: 'BOX', label: '+ ADD OBJECT' },
  'MUROS': { kind: 'WALL', label: '+ ADD WALL' },
  'GRAFFITI': { kind: 'WALL', label: '+ ADD GRAFFITI WALL' },
  'ITENS': { kind: 'SPHERE', label: '+ ADD ITEM' },
};

class ConfiguratorApp {
  constructor(root) {
    this.root = root;
    this.projectManager = new ProjectManager();
    this.assetManager = new AssetManager();
    this.activeCategory = 'CENÁRIO';
    this._buildLayout();
  }

  _buildLayout() {
    this.root.innerHTML = `
      <div class="topbar">
        <div class="brand">OGEID<span>_</span>CONFIGURATOR</div>
        <div class="topbar-sep"></div>
        <button class="btn" id="btn-new">NEW</button>
        <button class="btn" id="btn-save">SAVE</button>
        <button class="btn" id="btn-load">LOAD</button>
        <button class="btn" id="btn-export">EXPORT JSON</button>
        <button class="btn" id="btn-import">IMPORT JSON</button>
        <input type="file" id="import-input" accept="application/json" style="display:none" />
        <div class="topbar-sep"></div>
        <button class="btn" id="btn-debug">DEBUG</button>
        <div class="topbar-spacer"></div>
        <button class="btn primary" id="btn-play">▶ PLAY</button>
      </div>

      <div class="main">
        <div class="panel-left">
          <div class="section-title">CATEGORIAS</div>
          <ul class="cat-list" id="cat-list"></ul>
          <div class="asset-lib" id="asset-lib"></div>
        </div>

        <div class="viewport-wrap">
          <div class="gizmo-toolbar" id="gizmo-toolbar">
            <button class="btn icon active" data-mode="translate" title="Move (W)">✛ MOVE</button>
            <button class="btn icon" data-mode="rotate" title="Rotate (E)">↻ ROTATE</button>
            <button class="btn icon" data-mode="scale" title="Scale (R)">⤢ SCALE</button>
          </div>
          <div id="viewport"></div>
          <div class="viewport-hud" id="viewport-hud">FASE 1 — EDITOR 3D</div>
          <div class="viewport-hint">Clique: selecionar · W/E/R: mover/girar/escalar · Del: excluir</div>
        </div>

        <div class="panel-right" id="inspector"></div>
      </div>

      <div class="statusbar">
        <span><span class="dot"></span>PROJETO: <span id="status-project">—</span></span>
        <span id="status-add"></span>
        <span id="status-count">0 objetos</span>
      </div>
    `;

    this.sceneManager = new SceneManager(this.root.querySelector('#viewport'));
    this.gizmo = new TransformGizmo({ sceneManager: this.sceneManager });

    this._buildCategoryList();
    this._buildAssetLibrary();
    this._buildInspector();
    this._buildGizmoToolbar();
    this._buildTopbar();
    this._buildViewportSelection();

    bus.on('scene:objectRemoved', () => this._refreshStatus());
    bus.on('gizmo:objectChanged', () => this._debouncedAutosave());
    bus.on('inspector:deleteRequested', (obj) => this._deleteObject(obj));
    bus.on('inspector:duplicateRequested', (obj) => this._duplicateObject(obj));
    bus.on('asset:imported', () => this._debouncedAutosave());

    this._loadOrBootstrapDemo();
    this._refreshStatus();
  }

  // ---------- painel esquerdo: categorias ----------
  _buildCategoryList() {
    const list = this.root.querySelector('#cat-list');
    list.innerHTML = CATEGORIES
      .map((c, i) => `<li class="cat-item ${c === this.activeCategory ? 'active' : ''}" data-cat="${c}"><span class="num">${String(i+1).padStart(2,'0')}</span>${c}</li>`)
      .join('');
    list.querySelectorAll('.cat-item').forEach((el) => {
      el.addEventListener('click', () => {
        this.activeCategory = el.dataset.cat;
        list.querySelectorAll('.cat-item').forEach((x) => x.classList.remove('active'));
        el.classList.add('active');
        this.assetLibrary.setCategory(this._categoryToAssetTag(this.activeCategory));
        this._renderAddButton();
      });
    });
    this._renderAddButton();
  }

  _categoryToAssetTag(cat) {
    const map = { 'CENÁRIO':'CENARIO','PERSONAGEM':'PERSONAGEM','NPC':'NPC','SEGURANÇA':'SEGURANCA','CÂMERAS':'CAMERAS','OBJETOS':'OBJETOS','MUROS':'MUROS','GRAFFITI':'GRAFFITI','ITENS':'ITENS' };
    return map[cat] || 'OBJETOS';
  }

  _renderAddButton() {
    const status = this.root.querySelector('#status-add');
    const conf = CATEGORY_ADD[this.activeCategory];
    if (!conf) { status.innerHTML = ''; return; }
    status.innerHTML = `<button class="btn icon" id="btn-add-primitive">${conf.label}</button>`;
    this.root.querySelector('#btn-add-primitive').addEventListener('click', () => {
      placePrimitive({ sceneManager: this.sceneManager, kind: conf.kind, category: this._categoryToAssetTag(this.activeCategory) });
      this._refreshStatus();
      this._debouncedAutosave();
    });
  }

  // ---------- painel esquerdo: asset library ----------
  _buildAssetLibrary() {
    this.assetLibrary = new AssetLibrary({
      container: this.root.querySelector('#asset-lib'),
      assetManager: this.assetManager,
      sceneManager: this.sceneManager,
      projectManager: this.projectManager,
      onChange: () => { this._refreshStatus(); this._debouncedAutosave(); },
    });
    this.assetLibrary.setCategory(this._categoryToAssetTag(this.activeCategory));
  }

  // ---------- painel direito ----------
  _buildInspector() {
    this.inspector = new Inspector({
      container: this.root.querySelector('#inspector'),
      sceneManager: this.sceneManager,
      onChange: () => this._debouncedAutosave(),
    });
  }

  // ---------- toolbar de gizmo ----------
  _buildGizmoToolbar() {
    const toolbar = this.root.querySelector('#gizmo-toolbar');
    toolbar.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.gizmo.setMode(btn.dataset.mode);
        toolbar.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  // ---------- seleção por clique na viewport ----------
  _buildViewportSelection() {
    const dom = this.sceneManager.renderer.domElement;
    let downPos = null;
    dom.addEventListener('pointerdown', (e) => { downPos = [e.clientX, e.clientY]; });
    dom.addEventListener('pointerup', (e) => {
      const moved = downPos && (Math.abs(e.clientX - downPos[0]) > 4 || Math.abs(e.clientY - downPos[1]) > 4);
      if (moved) return; // foi um drag de órbita, não um clique de seleção
      const id = this.sceneManager.pickAt(e.clientX, e.clientY);
      this.sceneManager.select(id ? this.sceneManager.objects.get(id) : null);
    });
  }

  // ---------- topbar: new/save/load/export/import/play/debug ----------
  _buildTopbar() {
    this.root.querySelector('#btn-new').addEventListener('click', () => {
      if (!confirm('Criar novo projeto? As mudanças não salvas serão perdidas.')) return;
      this._clearScene();
      this.projectManager.newProject();
      this._bootstrapDemoScene();
      this._refreshStatus();
    });

    this.root.querySelector('#btn-save').addEventListener('click', () => this._saveProject());

    this.root.querySelector('#btn-load').addEventListener('click', () => {
      if (!this.projectManager.hasSavedProject()) { alert('Nenhum projeto salvo localmente ainda.'); return; }
      this._clearScene();
      const project = this.projectManager.load();
      this._hydrateSceneFromProject(project);
    });

    this.root.querySelector('#btn-export').addEventListener('click', () => {
      this._syncProjectFromScene();
      this.projectManager.exportJSON();
    });

    const importInput = this.root.querySelector('#import-input');
    this.root.querySelector('#btn-import').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      this._clearScene();
      const project = await this.projectManager.importJSON(file);
      await this.assetManager.hydrateFromProject(project.assets);
      this.assetLibrary.render();
      deserializeObjects({ sceneManager: this.sceneManager, assetManager: this.assetManager, objects: project.objects });
      this._refreshStatus();
      importInput.value = '';
    });

    this.root.querySelector('#btn-debug').addEventListener('click', (e) => {
      e.target.classList.toggle('active');
      bus.emit('debug:toggled', e.target.classList.contains('active'));
    });

    this.root.querySelector('#btn-play').addEventListener('click', () => {
      this._syncProjectFromScene();
      this.projectManager.save();
      window.location.href = 'game.html';
    });
  }

  // ---------- projeto <-> cena ----------
  _syncProjectFromScene() {
    const project = this.projectManager.project;
    project.assets = this.assetManager.serializeLibrary();
    project.objects = serializeObjects(this.sceneManager);
  }

  _saveProject() {
    this._syncProjectFromScene();
    this.projectManager.save();
    this._flashStatus('salvo localmente ✓');
  }

  _debouncedAutosave() {
    clearTimeout(this._autosaveTimer);
    this._autosaveTimer = setTimeout(() => this._saveProject(), 800);
  }

  _clearScene() {
    [...this.sceneManager.objects.keys()].forEach((id) => this.sceneManager.removeObject(id));
  }

  _hydrateSceneFromProject(project) {
    this.assetManager.hydrateFromProject(project.assets).then(() => {
      this.assetLibrary.render();
      deserializeObjects({ sceneManager: this.sceneManager, assetManager: this.assetManager, objects: project.objects });
      this._refreshStatus();
    });
  }

  _deleteObject(obj) {
    if (!obj?.userData?.ogeidId) return;
    this.sceneManager.removeObject(obj.userData.ogeidId);
    this.inspector.setTarget(null);
    this._refreshStatus();
    this._debouncedAutosave();
  }

  _duplicateObject(obj) {
    if (!obj?.userData?.ogeidId) return;
    const data = obj.userData.ogeidData;
    // reimporta via factory pra manter mixer/skeleton corretos quando vier de GLB
    import('./SceneObjectFactory.js').then(({ placeAssetInstance, placePrimitive }) => {
      const offsetPos = obj.position.clone().add(new THREE.Vector3(1, 0, 1));
      let newId;
      if (data.assetId) {
        newId = placeAssetInstance({ assetManager: this.assetManager, sceneManager: this.sceneManager, assetId: data.assetId, position: offsetPos });
      } else if (data.primitive) {
        newId = placePrimitive({ sceneManager: this.sceneManager, kind: data.primitive, category: data.category, position: offsetPos });
      }
      if (newId) {
        const newObj = this.sceneManager.objects.get(newId);
        newObj.rotation.copy(obj.rotation);
        newObj.scale.copy(obj.scale);
        newObj.userData.ogeidData.collision = data.collision;
      }
      this._refreshStatus();
      this._debouncedAutosave();
    });
  }

  _refreshStatus() {
    this.root.querySelector('#status-count').textContent = `${this.sceneManager.objects.size} objetos`;
    this.root.querySelector('#status-project').textContent = this.projectManager.project.meta.name;
  }

  _flashStatus(msg) {
    const el = this.root.querySelector('#status-project');
    const original = el.textContent;
    el.textContent = `${original} — ${msg}`;
    setTimeout(() => { el.textContent = original; }, 1500);
  }

  // ---------- primeira execução: mapa de demonstração ----------
  _loadOrBootstrapDemo() {
    if (this.projectManager.hasSavedProject()) {
      const project = this.projectManager.load();
      this._hydrateSceneFromProject(project);
    } else {
      this._bootstrapDemoScene();
      this._saveProject();
    }
  }

  _bootstrapDemoScene() {
    // Mapa mínimo de demonstração (sem GLBs ainda): personagem, "segurança",
    // 3 muros, 1 prédio, algumas caixas e a área de graffiti — tudo como
    // primitivas que você troca pelos seus GLBs depois, sem perder posição.
    placePrimitive({ sceneManager: this.sceneManager, kind: 'CAPSULE', category: 'PERSONAGEM', position: new THREE.Vector3(0, 0.9, 0) });
    placePrimitive({ sceneManager: this.sceneManager, kind: 'CAPSULE', category: 'SEGURANCA', position: new THREE.Vector3(-5, 0.9, 3) });
    placePrimitive({ sceneManager: this.sceneManager, kind: 'WALL', category: 'MUROS', position: new THREE.Vector3(4, 1.2, -4) });
    placePrimitive({ sceneManager: this.sceneManager, kind: 'WALL', category: 'GRAFFITI', position: new THREE.Vector3(4, 1.2, -6) });
    placePrimitive({ sceneManager: this.sceneManager, kind: 'BOX', category: 'CENARIO', position: new THREE.Vector3(-8, 1.5, -6) });
    placePrimitive({ sceneManager: this.sceneManager, kind: 'BOX', category: 'OBJETOS', position: new THREE.Vector3(2, 0.5, 2) });
    placePrimitive({ sceneManager: this.sceneManager, kind: 'SPHERE', category: 'CAMERAS', position: new THREE.Vector3(6, 3, 0) });
    this.sceneManager.select(null);
  }
}

new ConfiguratorApp(document.getElementById('app'));
