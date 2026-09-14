/**
 * TransformControls.js (configurador)
 * Encapsula o addon TransformControls do Three.js, adicionando:
 *  - atalhos de teclado (W/E/R para mover/rotacionar/escalar, Q esconde o gizmo)
 *  - snap-to-grid opcional
 *  - desativação do OrbitControls enquanto o gizmo está sendo arrastado
 *    (senão os dois brigam pelo mouse)
 */

import { TransformControls as ThreeTransformControls } from 'three/addons/controls/TransformControls.js';
import { bus } from '../core/EventBus.js';
import { DEFAULT_SNAP, TRANSFORM_MODES } from '../core/Constants.js';

export class EditorTransformControls {
  constructor(camera, domElement, orbitControls, scene) {
    this.gizmo = new ThreeTransformControls(camera, domElement);
    this.gizmo.setSize(0.9);
    this.orbitControls = orbitControls;
    this.snapEnabled = false;

    scene.add(this.gizmo.getHelper ? this.gizmo.getHelper() : this.gizmo);

    this.gizmo.addEventListener('dragging-changed', (event) => {
      this.orbitControls.enabled = !event.value;
    });

    this.gizmo.addEventListener('objectChange', () => {
      bus.emit('transform:changed');
    });

    window.addEventListener('keydown', (e) => {
      if (this._isTypingInInput(e)) return;
      if (e.key === 'w' || e.key === 'W') this.setMode('translate');
      if (e.key === 'e' || e.key === 'E') this.setMode('rotate');
      if (e.key === 'r' || e.key === 'R') this.setMode('scale');
      if (e.key === 'Escape') bus.emit('selection:clear');
      if (e.key === 'Delete' || e.key === 'Backspace') bus.emit('selection:deleteRequested');
      if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        bus.emit('selection:duplicateRequested');
      }
    });
  }

  _isTypingInInput(e) {
    const tag = e.target?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable;
  }

  attach(object3D) {
    this.gizmo.attach(object3D);
  }

  detach() {
    this.gizmo.detach();
  }

  setMode(mode) {
    if (!TRANSFORM_MODES.includes(mode)) return;
    this.gizmo.setMode(mode);
    bus.emit('transform:modeChanged', mode);
  }

  setSnap(enabled) {
    this.snapEnabled = enabled;
    this.gizmo.setTranslationSnap(enabled ? DEFAULT_SNAP : null);
    this.gizmo.setRotationSnap(enabled ? Math.PI / 12 : null);
    this.gizmo.setScaleSnap(enabled ? 0.1 : null);
  }
}
