/**
 * SceneManager.js
 * Encapsula tudo que é "Three.js puro": scene, câmeras, renderer, luzes,
 * grid, chão e o loop de renderização. Mantém um registro (Map) de todos
 * os objetos colocados no mapa (id -> { object3D, meta }) para que o
 * Inspector, o Outliner e o ProjectManager consigam ler/serializar o mundo
 * sem precisar caminhar pela árvore da cena.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { bus } from '../core/EventBus.js';
import { uuid } from '../core/Utils.js';
import { GRID_SIZE, GRID_DIVISIONS, LAYERS } from '../core/Constants.js';

class SceneManagerImpl {
  constructor() {
    this.objects = new Map(); // id -> { id, name, layer, assetId, object3D, collision }
    this.clock = new THREE.Clock();
    this._layerGroups = {};
  }

  /** Inicializa a cena dentro do elemento container informado. */
  init(container) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0c0d);
    this.scene.fog = new THREE.FogExp2(0x0b0c0d, 0.012);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    this.camera.position.set(18, 16, 18);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.target.set(0, 1, 0);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.orbit.maxPolarAngle = Math.PI * 0.49;
    this.orbit.update();

    this._buildLayerGroups();
    this._buildLights();
    this._buildGroundAndGrid();

    this._resizeObserver = new ResizeObserver(() => this.handleResize());
    this._resizeObserver.observe(container);
    this.handleResize();

    this._animate = this._animate.bind(this);
    this._raf = requestAnimationFrame(this._animate);
  }

  _buildLayerGroups() {
    for (const layer of LAYERS) {
      const group = new THREE.Group();
      group.name = `LAYER_${layer}`;
      this.scene.add(group);
      this._layerGroups[layer] = group;
    }
  }

  _buildLights() {
    this.ambientLight = new THREE.AmbientLight(0x394155, 0.55);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0x9fb4ff, 1.1);
    this.sunLight.position.set(-12, 20, 8);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.left = -30;
    this.sunLight.shadow.camera.right = 30;
    this.sunLight.shadow.camera.top = 30;
    this.sunLight.shadow.camera.bottom = -30;
    this.sunLight.shadow.camera.far = 80;
    this.sunLight.shadow.bias = -0.0015;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Luz de destaque quente (referência: néon urbano) para dar clima noturno.
    const rim = new THREE.PointLight(0xff3d7f, 6, 30, 2);
    rim.position.set(6, 4, -6);
    this.scene.add(rim);
  }

  _buildGroundAndGrid() {
    const groundGeo = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.95, metalness: 0.05 });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.userData.isGround = true;
    this._layerGroups.GROUND.add(this.ground);

    this.grid = new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, 0x2c2f33, 0x1c1e21);
    this.grid.position.y = 0.001;
    this._layerGroups.GROUND.add(this.grid);
  }

  handleResize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _animate() {
    this._raf = requestAnimationFrame(this._animate);
    const delta = this.clock.getDelta();
    for (const { object3D } of this.objects.values()) {
      object3D.userData.mixer?.update(delta);
    }
    this.orbit.update();
    this.renderer.render(this.scene, this.camera);
  }

  // ---------- Gerenciamento de objetos do mundo ----------

  /**
   * Adiciona um Object3D já instanciado (ex: vindo do AssetManager) ao mundo.
   * @param {THREE.Object3D} object3D
   * @param {{ name?: string, layer?: string, assetId?: string, collision?: boolean, id?: string }} meta
   */
  addObject(object3D, meta = {}) {
    const id = meta.id || uuid();
    const layer = meta.layer && this._layerGroups[meta.layer] ? meta.layer : 'PROPS';

    object3D.userData.id = id;
    object3D.userData.collision = meta.collision ?? true;
    object3D.traverse((child) => {
      if (child.isMesh) child.userData.rootId = id;
    });

    this._layerGroups[layer].add(object3D);

    const entry = {
      id,
      name: meta.name || object3D.userData.assetName || 'Objeto',
      layer,
      assetId: meta.assetId || object3D.userData.assetId || null,
      object3D,
      collision: object3D.userData.collision,
    };
    this.objects.set(id, entry);
    bus.emit('scene:objectAdded', entry);
    return entry;
  }

  removeObject(id) {
    const entry = this.objects.get(id);
    if (!entry) return;
    entry.object3D.parent?.remove(entry.object3D);
    this.objects.delete(id);
    bus.emit('scene:objectRemoved', id);
  }

  duplicateObject(id) {
    const entry = this.objects.get(id);
    if (!entry) return null;
    const clone = entry.object3D.clone(true);
    clone.position.x += 1;
    clone.position.z += 1;
    const newEntry = this.addObject(clone, {
      name: `${entry.name} (cópia)`,
      layer: entry.layer,
      assetId: entry.assetId,
      collision: entry.collision,
    });
    return newEntry;
  }

  setLayerVisible(layer, visible) {
    if (this._layerGroups[layer]) this._layerGroups[layer].visible = visible;
  }

  getEntry(id) {
    return this.objects.get(id) || null;
  }

  getAllEntries() {
    return [...this.objects.values()];
  }

  clearWorldObjects() {
    for (const id of [...this.objects.keys()]) this.removeObject(id);
  }

  /** Raycast a partir de coordenadas normalizadas de tela (-1..1). */
  raycastFromScreen(ndcX, ndcY) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
    const intersectable = LAYERS.filter((l) => l !== 'LIGHTS').map((l) => this._layerGroups[l]);
    const intersects = raycaster.intersectObjects(intersectable, true);
    for (const hit of intersects) {
      let obj = hit.object;
      while (obj && !obj.userData.id && obj.parent) obj = obj.parent;
      if (obj?.userData?.id) return { entry: this.objects.get(obj.userData.id), point: hit.point };
    }
    return null;
  }
}

export const SceneManager = new SceneManagerImpl();
