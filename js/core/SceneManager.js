// SceneManager.js
// Dono da cena Three.js do EDITOR: renderer, câmera de trabalho (OrbitControls),
// grid, iluminação padrão "cidade industrial à noite", registro de objetos
// (id -> Object3D) e seleção via raycast. O GAME usa seu próprio
// CameraController (isométrico) — este arquivo é só do configurador.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { bus } from './EventBus.js';

export class SceneManager {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0b0d);
    this.scene.fog = new THREE.FogExp2(0x0a0b0d, 0.018);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
    this.camera.position.set(14, 12, 14);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 1, 0);

    this._buildLighting();
    this._buildGrid();

    // registro: id -> Object3D  (todo objeto colocável no mapa passa por aqui)
    this.objects = new Map();
    this.selected = null;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._onResize();

    this._clock = new THREE.Clock();
    this._animate = this._animate.bind(this);
    this._animate();
  }

  _buildLighting() {
    const ambient = new THREE.HemisphereLight(0x38405a, 0x0a0a0c, 0.55);
    this.scene.add(ambient);
    this.hemi = ambient;

    const moon = new THREE.DirectionalLight(0x6f86ff, 0.5);
    moon.position.set(-10, 20, -6);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.left = -30;
    moon.shadow.camera.right = 30;
    moon.shadow.camera.top = 30;
    moon.shadow.camera.bottom = -30;
    this.scene.add(moon);
    this.dirLight = moon;

    // ponto de luz quente simulando poste/janela — vibe industrial noturna
    const streetLamp = new THREE.PointLight(0xff9a4d, 1.2, 22, 2);
    streetLamp.position.set(4, 4.5, 2);
    streetLamp.castShadow = true;
    this.scene.add(streetLamp);
    this.streetLamp = streetLamp;

    const accentLamp = new THREE.PointLight(0xff3d7f, 0.8, 16, 2);
    accentLamp.position.set(-6, 3, -4);
    this.scene.add(accentLamp);
  }

  _buildGrid() {
    const grid = new THREE.GridHelper(60, 60, 0x35383f, 0x1c1e22);
    grid.position.y = 0;
    this.scene.add(grid);
    this.grid = grid;

    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    this.scene.add(ground);
    this.ground = ground;
  }

  toggleGrid(visible) {
    this.grid.visible = visible;
  }

  /** Registra um Object3D como "objeto do mapa" selecionável, com metadados do editor. */
  registerObject(id, object3D, data = {}) {
    object3D.userData.ogeidId = id;
    object3D.userData.ogeidData = data;
    this.scene.add(object3D);
    this.objects.set(id, object3D);
    return object3D;
  }

  removeObject(id) {
    const obj = this.objects.get(id);
    if (!obj) return;
    if (this.selected === obj) this.select(null);
    this.scene.remove(obj);
    this.objects.delete(id);
    bus.emit('scene:objectRemoved', id);
  }

  select(object3D) {
    this.selected = object3D || null;
    bus.emit('scene:selectionChanged', this.selected);
  }

  pickAt(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const candidates = [...this.objects.values()];
    const hits = this.raycaster.intersectObjects(candidates, true);
    if (!hits.length) return null;

    // sobe até achar o objeto raiz registrado (o hit pode ser um filho/mesh interno)
    let obj = hits[0].object;
    while (obj && !obj.userData.ogeidId && obj.parent) obj = obj.parent;
    return obj?.userData.ogeidId ? obj : null;
  }

  _onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  _animate() {
    requestAnimationFrame(this._animate);
    const dt = this._clock.getDelta();
    this.controls.update();
    bus.emit('scene:tick', dt);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
  }
}
