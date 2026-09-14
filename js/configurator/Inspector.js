/**
 * Inspector.js
 * Painel direito do configurador. Mostra e edita as propriedades do
 * objeto atualmente selecionado: nome, transform (position/rotation/scale),
 * layer, collision e — se o GLB tiver animações — uma lista para pré-visualizar
 * cada clip (Idle, Walk, Run, Spray, etc).
 */

import * as THREE from 'three';
import { el, radToDeg, degToRad, round } from '../core/Utils.js';
import { bus } from '../core/EventBus.js';
import { LAYERS } from '../core/Constants.js';

export class Inspector {
  constructor(root) {
    this.root = root;
    this.entry = null;
    this._activeAction = null;
    this.render();

    bus.on('selection:changed', (entry) => this.setEntry(entry));
    bus.on('transform:changed', () => this._syncFieldsFromObject());
  }

  setEntry(entry) {
    this.entry = entry;
    this.render();
  }

  render() {
    this.root.innerHTML = '';

    if (!this.entry) {
      this.root.append(
        el('div', { class: 'inspector-empty' }, [
          el('p', {}, 'Nenhum objeto selecionado.'),
          el('p', { class: 'muted' }, 'Clique em um objeto no viewport ou na Asset Library para posicioná-lo.'),
        ])
      );
      return;
    }

    const { entry } = this;
    const obj = entry.object3D;

    // ---- Nome ----
    const nameInput = el('input', {
      type: 'text',
      value: entry.name,
      class: 'field-input',
      onChange: (e) => {
        entry.name = e.target.value;
        bus.emit('scene:objectRenamed', entry);
      },
    });

    // ---- Layer ----
    const layerSelect = el(
      'select',
      {
        class: 'field-input',
        onChange: (e) => bus.emit('inspector:layerChangeRequested', { entry, layer: e.target.value }),
      },
      LAYERS.map((l) => el('option', { value: l, selected: l === entry.layer ? 'selected' : undefined }, l))
    );

    // ---- Collision ----
    const collisionCheckbox = el('input', {
      type: 'checkbox',
      checked: entry.collision ? 'checked' : undefined,
      onChange: (e) => {
        entry.collision = e.target.checked;
        obj.userData.collision = e.target.checked;
      },
    });

    this.root.append(
      el('div', { class: 'inspector-section' }, [
        el('label', { class: 'field-label' }, 'NOME'),
        nameInput,
      ]),
      el('div', { class: 'inspector-row' }, [
        el('div', { class: 'inspector-section half' }, [el('label', { class: 'field-label' }, 'LAYER'), layerSelect]),
        el('div', { class: 'inspector-section half' }, [
          el('label', { class: 'field-label checkbox-label' }, [collisionCheckbox, ' COLLISION']),
        ]),
      ])
    );

    this._buildTransformSection(obj);
    this._buildAnimationSection(obj);

    // ---- Ações ----
    this.root.append(
      el('div', { class: 'inspector-actions' }, [
        el('button', { class: 'btn btn-ghost', onClick: () => bus.emit('selection:duplicateRequested') }, 'DUPLICAR'),
        el('button', { class: 'btn btn-danger', onClick: () => bus.emit('selection:deleteRequested') }, 'EXCLUIR'),
      ])
    );
  }

  _buildTransformSection(obj) {
    const makeVector3Row = (label, getVec, onInput, isRotation = false) => {
      const vec = getVec();
      const toDisplay = (v) => (isRotation ? radToDeg(v) : round(v, 3));
      const fromDisplay = (v) => (isRotation ? degToRad(v) : parseFloat(v));

      const inputs = ['x', 'y', 'z'].map((axis) =>
        el('input', {
          type: 'number',
          step: isRotation ? '1' : '0.1',
          value: toDisplay(vec[axis]),
          class: 'field-input field-number',
          dataset: { axis },
          onChange: (e) => {
            const v = fromDisplay(e.target.value || 0);
            onInput(axis, v);
            bus.emit('transform:changed');
          },
        })
      );

      return el('div', { class: 'inspector-section' }, [
        el('label', { class: 'field-label' }, label),
        el('div', { class: 'vector3-row' }, inputs),
      ]);
    };

    this._transformWrap = el('div', { class: 'inspector-group' }, [
      el('h4', { class: 'group-title' }, 'TRANSFORM'),
      makeVector3Row('POSITION', () => obj.position, (axis, v) => (obj.position[axis] = v)),
      makeVector3Row('ROTATION (°)', () => obj.rotation, (axis, v) => (obj.rotation[axis] = v), true),
      makeVector3Row('SCALE', () => obj.scale, (axis, v) => (obj.scale[axis] = v)),
    ]);

    this.root.append(this._transformWrap);
  }

  /** Reescreve os valores numéricos do transform sem recriar o DOM (usado durante o drag do gizmo). */
  _syncFieldsFromObject() {
    if (!this.entry || !this._transformWrap) return;
    const obj = this.entry.object3D;
    const rows = this._transformWrap.querySelectorAll('.vector3-row');
    const [posRow, rotRow, scaleRow] = rows;
    const apply = (row, vec, isRotation) => {
      row.querySelectorAll('input').forEach((input) => {
        const axis = input.dataset.axis;
        const raw = vec[axis];
        input.value = isRotation ? radToDeg(raw) : round(raw, 3);
      });
    };
    if (posRow) apply(posRow, obj.position, false);
    if (rotRow) apply(rotRow, obj.rotation, true);
    if (scaleRow) apply(scaleRow, obj.scale, false);
  }

  _buildAnimationSection(obj) {
    const clips = obj.userData.animationClips;
    if (!clips || !clips.length) return;

    const mixer = obj.userData.mixer;

    const select = el(
      'select',
      { class: 'field-input' },
      clips.map((clip, i) => el('option', { value: i }, clip.name || `Clip ${i}`))
    );

    const playBtn = el('button', { class: 'btn btn-ghost' }, '▶ PLAY');
    const stopBtn = el('button', { class: 'btn btn-ghost' }, '■ STOP');

    playBtn.addEventListener('click', () => {
      this._activeAction?.stop();
      const clip = clips[select.value];
      const action = mixer.clipAction(clip);
      action.reset().setLoop(THREE.LoopRepeat, Infinity).play();
      this._activeAction = action;
    });

    stopBtn.addEventListener('click', () => {
      this._activeAction?.stop();
      this._activeAction = null;
    });

    this.root.append(
      el('div', { class: 'inspector-group' }, [
        el('h4', { class: 'group-title' }, `ANIMAÇÕES (${clips.length})`),
        el('div', { class: 'inspector-section' }, [select]),
        el('div', { class: 'inspector-row' }, [playBtn, stopBtn]),
      ])
    );
  }
}
