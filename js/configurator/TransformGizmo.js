// TransformGizmo.js
// Encapsula o TransformControls oficial do three.js pra dar o comportamento
// "editor 3D" pedido: gizmos de MOVE / ROTATE / SCALE, com atalhos de teclado
// (W/E/R, como Blender/Unity) e desligando o OrbitControls enquanto arrasta.

import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { bus } from '../core/EventBus.js';

export class TransformGizmo {
  constructor({ sceneManager }) {
    this.sceneManager = sceneManager;
    this.controls = new TransformControls(sceneManager.camera, sceneManager.renderer.domElement);
    this.controls.addEventListener('dragging-changed', (e) => {
      sceneManager.controls.enabled = !e.value;
    });
    this.controls.addEventListener('objectChange', () => {
      bus.emit('gizmo:objectChanged', this.controls.object);
    });
    sceneManager.scene.add(this.controls);

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return; // não rouba atalho de campo de texto
      if (e.key === 'w' || e.key === 'W') this.setMode('translate');
      if (e.key === 'e' || e.key === 'E') this.setMode('rotate');
      if (e.key === 'r' || e.key === 'R') this.setMode('scale');
      if (e.key === 'Escape') this.detach();
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.controls.object) {
        bus.emit('inspector:deleteRequested', this.controls.object);
      }
    });

    bus.on('scene:selectionChanged', (obj) => {
      if (obj) this.attach(obj); else this.detach();
    });
  }

  attach(object3D) {
    this.controls.attach(object3D);
  }

  detach() {
    this.controls.detach();
  }

  setMode(mode) {
    this.controls.setMode(mode);
    bus.emit('gizmo:modeChanged', mode);
  }
}
