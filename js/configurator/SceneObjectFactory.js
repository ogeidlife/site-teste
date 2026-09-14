// SceneObjectFactory.js
// Cria objetos do mapa (a partir de um asset GLB ou de uma primitiva
// placeholder, para quando você ainda não importou o GLB definitivo) e
// registra no SceneManager com os metadados que o Inspector e o
// ProjectManager precisam (categoria, colisão, referência ao asset).

import * as THREE from 'three';

function uid(prefix = 'obj') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const PRIMITIVE_GEOMETRY = {
  BOX: () => new THREE.BoxGeometry(1, 1, 1),
  WALL: () => new THREE.BoxGeometry(3, 2.4, 0.2),
  PLANE: () => new THREE.PlaneGeometry(2, 2),
  CAPSULE: () => new THREE.CapsuleGeometry(0.35, 1, 4, 8),
  SPHERE: () => new THREE.SphereGeometry(0.5, 16, 16),
};

const PRIMITIVE_COLOR = {
  BOX: 0x3a3d44,
  WALL: 0x2c2e33,
  PLANE: 0x8a8d93,
  CAPSULE: 0xff3d7f,
  SPHERE: 0xffb020,
};

/** Coloca uma instância de um asset GLB importado no centro da viewport. */
export function placeAssetInstance({ assetManager, sceneManager, assetId, position }) {
  const asset = assetManager.get(assetId);
  const instance = assetManager.createInstance(assetId);
  if (!instance) return null;

  const id = uid('obj');
  const pos = position || sceneManager.controls.target.clone();
  instance.object3D.position.copy(pos);

  sceneManager.registerObject(id, instance.object3D, {
    name: asset.name,
    category: asset.category,
    assetId,
    collision: true,
    mixer: instance.mixer,
    clips: instance.clips,
  });
  sceneManager.select(instance.object3D);
  return id;
}

/** Cria uma primitiva placeholder (usado antes de você ter o GLB definitivo). */
export function placePrimitive({ sceneManager, kind = 'BOX', category = 'OBJETOS', position }) {
  const geo = (PRIMITIVE_GEOMETRY[kind] || PRIMITIVE_GEOMETRY.BOX)();
  const mat = new THREE.MeshStandardMaterial({ color: PRIMITIVE_COLOR[kind] ?? 0x555555, roughness: 0.8 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const id = uid('obj');
  const pos = position || sceneManager.controls.target.clone();
  if (kind === 'WALL' || kind === 'BOX') pos.y += 0.5;
  mesh.position.copy(pos);

  sceneManager.registerObject(id, mesh, {
    name: `${kind}_${id.slice(-4)}`,
    category,
    assetId: null,
    primitive: kind,
    collision: kind !== 'PLANE',
  });
  sceneManager.select(mesh);
  return id;
}

/** Serializa todos os objetos registrados no SceneManager para o project.json. */
export function serializeObjects(sceneManager) {
  const out = [];
  for (const [id, obj] of sceneManager.objects.entries()) {
    const data = obj.userData.ogeidData || {};
    out.push({
      id,
      name: data.name || id,
      category: data.category || 'OBJETOS',
      assetId: data.assetId || null,
      primitive: data.primitive || null,
      collision: !!data.collision,
      position: obj.position.toArray(),
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale: obj.scale.toArray(),
      properties: data.properties || {},
    });
  }
  return out;
}

/** Reconstrói os objetos no SceneManager a partir do project.json (ao carregar/importar). */
export function deserializeObjects({ sceneManager, assetManager, objects = [] }) {
  for (const o of objects) {
    let object3D;
    let extra = {};
    if (o.assetId && assetManager.get(o.assetId)) {
      const instance = assetManager.createInstance(o.assetId);
      object3D = instance.object3D;
      extra = { mixer: instance.mixer, clips: instance.clips };
    } else if (o.primitive) {
      const geo = (PRIMITIVE_GEOMETRY[o.primitive] || PRIMITIVE_GEOMETRY.BOX)();
      const mat = new THREE.MeshStandardMaterial({
        color: PRIMITIVE_COLOR[o.primitive] ?? 0x555555,
        roughness: 0.8,
      });
      object3D = new THREE.Mesh(geo, mat);
      object3D.castShadow = true;
      object3D.receiveShadow = true;
    }
    if (!object3D) continue; // asset ausente (GLB não reimportado ainda neste navegador)

    object3D.position.fromArray(o.position);
    object3D.rotation.set(...o.rotation);
    object3D.scale.fromArray(o.scale);

    sceneManager.registerObject(o.id, object3D, {
      name: o.name,
      category: o.category,
      assetId: o.assetId,
      primitive: o.primitive,
      collision: o.collision,
      properties: o.properties,
      ...extra,
    });
  }
}
