// Inspector.js
// Painel direito. Mostra e edita Transform (Position/Rotation/Scale em X/Y/Z),
// nome, categoria e colisão do objeto selecionado. Campos específicos por
// categoria (guarda, câmera, missão...) entram nas próximas fases — a UI já
// deixa um slot ("propriedades específicas") pronto pra isso.

import * as THREE from 'three';
import { bus } from '../core/EventBus.js';

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;

export class Inspector {
  constructor({ container, sceneManager, onChange }) {
    this.container = container;
    this.sceneManager = sceneManager;
    this.onChange = onChange || (() => {});
    this.current = null;

    bus.on('scene:selectionChanged', (obj) => this.setTarget(obj));
    bus.on('scene:tick', () => this._syncFromObject());

    this.renderEmpty();
  }

  renderEmpty() {
    this.container.innerHTML = `<div class="inspector-empty">Nenhum objeto selecionado.<br/><br/>Clique em um objeto na viewport ou coloque um novo asset a partir da biblioteca à esquerda.</div>`;
  }

  setTarget(object3D) {
    this.current = object3D;
    if (!object3D) return this.renderEmpty();
    this._render();
  }

  _data() {
    return this.current?.userData.ogeidData || {};
  }

  _render() {
    const data = this._data();
    const p = this.current.position;
    const r = this.current.rotation;
    const s = this.current.scale;

    this.container.innerHTML = `
      <div class="section-title">INSPECTOR</div>
      <div class="field-group">
        <div class="field-row"><label>NAME</label><input type="text" id="insp-name" value="${data.name || ''}" /></div>
        <div class="field-row"><label>CATEGORY</label>
          <select id="insp-category">
            ${['CENARIO','PERSONAGEM','NPC','SEGURANCA','CAMERAS','OBJETOS','MUROS','GRAFFITI','ITENS']
              .map((c) => `<option value="${c}" ${data.category === c ? 'selected' : ''}>${c}</option>`)
              .join('')}
          </select>
        </div>
        <div class="checkbox-row"><input type="checkbox" id="insp-collision" ${data.collision ? 'checked' : ''}/> COLLISION</div>
      </div>

      <div class="field-group">
        <div class="section-title" style="padding:0 0 6px;">POSITION</div>
        <div class="vec3">
          ${['x','y','z'].map((ax) => `<div class="axis"><span>${ax.toUpperCase()}</span><input type="number" step="0.1" id="pos-${ax}" value="${p[ax].toFixed(2)}"/></div>`).join('')}
        </div>
      </div>

      <div class="field-group">
        <div class="section-title" style="padding:0 0 6px;">ROTATION (°)</div>
        <div class="vec3">
          ${['x','y','z'].map((ax) => `<div class="axis"><span>${ax.toUpperCase()}</span><input type="number" step="1" id="rot-${ax}" value="${(r[ax]*RAD2DEG).toFixed(1)}"/></div>`).join('')}
        </div>
      </div>

      <div class="field-group">
        <div class="section-title" style="padding:0 0 6px;">SCALE</div>
        <div class="vec3">
          ${['x','y','z'].map((ax) => `<div class="axis"><span>${ax.toUpperCase()}</span><input type="number" step="0.1" id="scl-${ax}" value="${s[ax].toFixed(2)}"/></div>`).join('')}
        </div>
      </div>

      <div class="mini-btn-row">
        <button class="btn" id="insp-duplicate">DUPLICATE</button>
        <button class="btn" id="insp-delete" style="color:var(--danger);">DELETE</button>
      </div>
    `;

    const bind = (id, fn) => this.container.querySelector(id).addEventListener('input', fn);

    bind('#insp-name', (e) => { data.name = e.target.value; this.onChange(); });
    this.container.querySelector('#insp-category').addEventListener('change', (e) => { data.category = e.target.value; this.onChange(); });
    this.container.querySelector('#insp-collision').addEventListener('change', (e) => { data.collision = e.target.checked; this.onChange(); });

    ['x','y','z'].forEach((ax) => {
      bind(`#pos-${ax}`, (e) => { this.current.position[ax] = parseFloat(e.target.value) || 0; this.onChange(); });
      bind(`#rot-${ax}`, (e) => { this.current.rotation[ax] = (parseFloat(e.target.value) || 0) * DEG2RAD; this.onChange(); });
      bind(`#scl-${ax}`, (e) => { this.current.scale[ax] = parseFloat(e.target.value) || 0.01; this.onChange(); });
    });

    this.container.querySelector('#insp-duplicate').addEventListener('click', () => {
      bus.emit('inspector:duplicateRequested', this.current);
    });
    this.container.querySelector('#insp-delete').addEventListener('click', () => {
      bus.emit('inspector:deleteRequested', this.current);
    });
  }

  /** Mantém os campos de transform sincronizados quando o gizmo move o objeto. */
  _syncFromObject() {
    if (!this.current) return;
    const p = this.current.position, r = this.current.rotation, s = this.current.scale;
    const set = (id, val) => {
      const el = this.container.querySelector(id);
      if (el && document.activeElement !== el) el.value = val;
    };
    set('#pos-x', p.x.toFixed(2)); set('#pos-y', p.y.toFixed(2)); set('#pos-z', p.z.toFixed(2));
    set('#rot-x', (r.x*RAD2DEG).toFixed(1)); set('#rot-y', (r.y*RAD2DEG).toFixed(1)); set('#rot-z', (r.z*RAD2DEG).toFixed(1));
    set('#scl-x', s.x.toFixed(2)); set('#scl-y', s.y.toFixed(2)); set('#scl-z', s.z.toFixed(2));
  }
}
