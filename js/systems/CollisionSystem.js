/**
 * CollisionSystem.js
 * Fase 1: apenas guarda a flag "collision" por objeto (já persistida no
 * Inspector/ProjectManager) e expõe bounding boxes para debug visual.
 * Fase 2 (Player Controller) vai consumir `getSolidBoxes()` para bloquear
 * o movimento do jogador contra paredes/prédios/objetos sólidos, usando
 * checagem simples de AABB — sem física complexa, conforme pedido.
 */

import * as THREE from 'three';

export const CollisionSystem = {
  /**
   * Retorna as bounding boxes (mundo) de todos os objetos marcados com
   * collision = true dentro do SceneManager informado.
   */
  getSolidBoxes(sceneManager) {
    const boxes = [];
    for (const entry of sceneManager.getAllEntries()) {
      if (!entry.collision) continue;
      const box = new THREE.Box3().setFromObject(entry.object3D);
      boxes.push({ id: entry.id, box });
    }
    return boxes;
  },
};
