/**
 * EditorScene.js
 * Conecta o SceneManager (Three.js puro) com a interação do editor:
 * clique para selecionar, highlight do objeto selecionado, gizmo de
 * transformação, outliner (lista de objetos da cena) e os atalhos de
 * duplicar/excluir/colocar-no-mapa emitidos por outros painéis.
 */

import * as THREE from 'three';
import { el } from '../core/Utils.js';
import { bus } from '../core/EventBus.js';
import { SceneManager } from '../systems/SceneManager.js';
import { AssetManager } from '../systems/AssetManager.js';
import { EditorTransformControls } from './TransformControls.js';

export class EditorScene {
  constructor({ viewportEl, outlinerEl }) {
    this.viewportEl = viewportEl;
    this.outlinerEl = outlinerEl;
    this.selectedId = null;

    SceneManager.init(viewportEl);

    this.transform = new EditorTransformControls(
      SceneManager.camera,
      SceneManager.renderer.domElement,
      SceneManager.orbit,
      SceneManager.scene
    );

    this._highlightBox = new THREE.BoxHelper(new THREE.Object3D(), 0xff3d7f);
    this._highlightBox.visible = false;
    SceneManager.scene.add(this._highlightBox);

    this._bindViewportClicks();
    this._bindBusEvents();
    this._renderOutliner();
  }

  _bindViewportClicks() {
    this.viewportEl.addEventListener('pointerdown', (e) => {
      this._downPos = { x: e.clientX, y: e.clientY };
    });

    this.viewportEl.addEventListener('pointerup', (e) => {
      // Ignora cliques que na verdade foram um arraste de câmera/gizmo.
      const dx = Math.abs(e.clientX - this._downPos.x);
      const dy = Math.abs(e.clientY - this._downPos.y);
      if (dx > 4 || dy > 4) return;
      if (this.transform.gizmo.dragging) return;

      const rect = this.viewportEl.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const hit = SceneManager.raycastFromScreen(ndcX, ndcY);
      this.select(hit ? hit.entry.id : null);
    });
  }

  _bindBusEvents() {
    bus.on('assetLibrary:placeRequested', (assetId) => this.placeAsset(assetId));
    bus.on('selection:duplicateRequested', () => this._duplicateSelected());
    bus.on('selection:deleteRequested', () => this._deleteSelected());
    bus.on('selection:clear', () => this.select(null));
    bus.on('scene:objectAdded', () => this._renderOutliner());
    bus.on('scene:objectRemoved', () => this._renderOutliner());
    bus.on('scene:objectRenamed', () => this._renderOutliner());
    bus.on('inspector:layerChangeRequested', ({ entry, layer }) => {
      SceneManager._layerGroups[layer].add(entry.object3D);
      entry.layer = layer;
      this._renderOutliner();
    });
    bus.on('toolbar:transformMode', (mode) => this.transform.setMode(mode));
    bus.on('toolbar:snapToggled', (enabled) => this.transform.setSnap(enabled));
    bus.on('toolbar:layerVisibility', ({ layer, visible }) => SceneManager.setLayerVisible(layer, visible));
    bus.on('transform:changed', () => this.syncHighlight());
  }

  /** Instancia um asset da biblioteca no centro do mundo (ou próximo à câmera). */
  placeAsset(assetId) {
    const object3D = AssetManager.createInstance(assetId);
    const asset = AssetManager.getAsset(assetId);

    // Posiciona em frente ao alvo atual da órbita, não empilhado em (0,0,0).
    const target = SceneManager.orbit.target;
    object3D.position.set(target.x + (Math.random() - 0.5) * 2, 0, target.z + (Math.random() - 0.5) * 2);

    const entry = SceneManager.addObject(object3D, {
      name: asset.name,
      layer: 'PROPS',
      assetId,
    });
    this.select(entry.id);
    return entry;
  }

  select(id) {
    this.selectedId = id;
    const entry = id ? SceneManager.getEntry(id) : null;

    if (entry) {
      this.transform.attach(entry.object3D);
      this._highlightBox.setFromObject(entry.object3D);
      this._highlightBox.visible = true;
    } else {
      this.transform.detach();
      this._highlightBox.visible = false;
    }

    bus.emit('selection:changed', entry);
    this._renderOutliner();
  }

  _duplicateSelected() {
    if (!this.selectedId) return;
    const newEntry = SceneManager.duplicateObject(this.selectedId);
    if (newEntry) this.select(newEntry.id);
  }

  _deleteSelected() {
    if (!this.selectedId) return;
    SceneManager.removeObject(this.selectedId);
    this.select(null);
  }

  _renderOutliner() {
    if (!this.outlinerEl) return;
    this.outlinerEl.innerHTML = '';
    const entries = SceneManager.getAllEntries();

    if (!entries.length) {
      this.outlinerEl.append(el('p', { class: 'muted small' }, 'Cena vazia. Importe um GLB e clique em "+ MAPA".'));
      return;
    }

    for (const entry of entries) {
      const row = el(
        'div',
        {
          class: `outliner-row${entry.id === this.selectedId ? ' active' : ''}`,
          onClick: () => this.select(entry.id),
        },
        [el('span', { class: 'outliner-layer-tag' }, entry.layer.slice(0, 3)), el('span', {}, entry.name)]
      );
      this.outlinerEl.append(row);
    }
  }

  /** Loop de animação já roda dentro do SceneManager; aqui só sincronizamos o highlight. */
  syncHighlight() {
    if (this.selectedId) {
      const entry = SceneManager.getEntry(this.selectedId);
      if (entry) this._highlightBox.setFromObject(entry.object3D);
    }
  }
}
