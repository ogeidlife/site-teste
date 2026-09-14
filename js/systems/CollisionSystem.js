// CollisionSystem.js
// Colisão simples e barata: cada objeto marcado collision=true vira uma
// caixa (Box3) fixa no chão. O player não atravessa. Sem física real —
// prioriza estabilidade e desempenho, como pedido no spec (item 20).

import * as THREE from 'three';

export class CollisionSystem {
  constructor(sceneManager) {
    this.boxes = [];
    for (const obj of sceneManager.objects.values()) {
      const data = obj.userData.ogeidData;
      if (!data?.collision) continue;
      const box = new THREE.Box3().setFromObject(obj);
      this.boxes.push(box);
    }
    this.playerRadius = 0.4;
  }

  /** Retorna a posição resolvida: se "proposed" colide, tenta deslizar eixo a eixo. */
  resolve(current, proposed) {
    if (!this._collidesAt(proposed)) return proposed;

    const slideX = new THREE.Vector3(proposed.x, current.y, current.z);
    if (!this._collidesAt(slideX)) return slideX;

    const slideZ = new THREE.Vector3(current.x, current.y, proposed.z);
    if (!this._collidesAt(slideZ)) return slideZ;

    return current.clone();
  }

  _collidesAt(pos) {
    const r = this.playerRadius;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(pos.x - r, pos.y - 0.9, pos.z - r),
      new THREE.Vector3(pos.x + r, pos.y + 0.9, pos.z + r)
    );
    return this.boxes.some((b) => b.intersectsBox(playerBox));
  }
}
