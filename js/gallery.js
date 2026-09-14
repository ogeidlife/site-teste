import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let scene = null;
let artworkMeshes = []; // { mesh, data }
let hovered = null;
let inGallery = false;

const galleryChar = new THREE.Group();
{
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.4, 0.8, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0xefe8db })
  );
  body.position.y = 0.8;
  body.castShadow = true;
  galleryChar.add(body);
}
galleryChar.position.set(0, 0, 4);

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

window.addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  lastPointerClient = { x: e.clientX, y: e.clientY };
});

let lastPointerClient = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

const tooltipLayer = document.getElementById('tooltip-layer');
let tooltipEl = null;

function buildScene() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x120f0c);

  const hemi = new THREE.HemisphereLight(0xfff2e0, 0x14100a, 0.6);
  s.add(hemi);

  // warm gallery spotlights
  const positions = [-6, 0, 6];
  positions.forEach((x) => {
    const spot = new THREE.SpotLight(0xffe6c0, 1.1, 20, Math.PI / 6, 0.4, 1.2);
    spot.position.set(x, 6, -2);
    spot.target.position.set(x, 1.5, -4.8);
    spot.castShadow = true;
    s.add(spot);
    s.add(spot.target);
  });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 20),
    new THREE.MeshStandardMaterial({ color: 0x2a231c, roughness: 0.8 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  s.add(floor);

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a332a, roughness: 1 })
  );
  backWall.position.set(0, 4, -5);
  s.add(backWall);

  s.add(galleryChar);
  return s;
}

function placeholderMesh(type) {
  if (type === 'sculpture' || type === 'Escultura') {
    const geo = new THREE.TorusKnotGeometry(0.5, 0.18, 100, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0xb08d57, metalness: 0.6, roughness: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 1;
    return mesh;
  }
  // painting placeholder: frame + canvas
  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 2.0, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
  );
  const canvasMat = new THREE.MeshStandardMaterial({ color: 0x8899aa });
  const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.8), canvasMat);
  canvasMesh.position.z = 0.045;
  group.add(frame);
  group.add(canvasMesh);
  return group;
}

async function loadArtworks(s) {
  const res = await fetch('data/artworks.json');
  const { artworks } = await res.json();

  artworks.forEach((data) => {
    const container = new THREE.Group();
    container.position.set(data.position.x, data.position.y, data.position.z);
    container.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
    container.scale.setScalar(data.scale || 1);

    // Try to load the real .glb; fall back to a placeholder shape if it
    // doesn't exist yet (so the scene still works before assets are added).
    loader.load(
      data.glb,
      (gltf) => {
        container.add(gltf.scene);
      },
      undefined,
      () => {
        container.add(placeholderMesh(data.placeholder));
      }
    );

    container.traverse((obj) => { obj.castShadow = true; });
    s.add(container);
    artworkMeshes.push({ mesh: container, data });
  });
}

export function isInGallery() { return inGallery; }

export function enterGallery(renderer, camera) {
  if (inGallery) return;
  inGallery = true;
  artworkMeshes = [];
  scene = buildScene();
  loadArtworks(scene);
  galleryChar.position.set(0, 0, 4);
}

export function exitGallery(camera) {
  inGallery = false;
  hideTooltip();
}

function hideTooltip() {
  if (tooltipEl) {
    tooltipEl.remove();
    tooltipEl = null;
  }
  hovered = null;
}

function showTooltip(entry, screenX, screenY) {
  hideTooltip();
  hovered = entry;
  const { data } = entry;
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'art-tooltip';
  tooltipEl.style.left = screenX + 'px';
  tooltipEl.style.top = (screenY - 14) + 'px';
  tooltipEl.innerHTML = `
    <span class="kind">${data.type}</span>
    <h3>${data.title}</h3>
    <div class="price">R$ ${data.price.toFixed(2).replace('.', ',')}</div>
    <button class="buy-btn">Comprar</button>
  `;
  tooltipEl.querySelector('.buy-btn').addEventListener('click', () => {
    window.location.href = `product.html?id=${encodeURIComponent(data.id)}`;
  });
  tooltipLayer.appendChild(tooltipEl);
}

const clock = new THREE.Clock();

export function updateGallery(dt, renderer, camera) {
  if (!scene) return;

  // movement
  let dx = 0, dz = 0;
  if (keys['w'] || keys['arrowup']) dz -= 1;
  if (keys['s'] || keys['arrowdown']) dz += 1;
  if (keys['a'] || keys['arrowleft']) dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;

  if (dx !== 0 || dz !== 0) {
    const len = Math.hypot(dx, dz);
    dx /= len; dz /= len;
    galleryChar.position.x += dx * 5 * dt;
    galleryChar.position.z += dz * 5 * dt;
    galleryChar.rotation.y = Math.atan2(dx, dz);
  }
  galleryChar.position.x = THREE.MathUtils.clamp(galleryChar.position.x, -10, 10);
  galleryChar.position.z = THREE.MathUtils.clamp(galleryChar.position.z, -4, 8);

  const camOffset = new THREE.Vector3(0, 4.5, 6.5);
  const desiredCamPos = galleryChar.position.clone().add(camOffset);
  camera.position.lerp(desiredCamPos, 1 - Math.pow(0.001, dt));
  camera.lookAt(galleryChar.position.clone().add(new THREE.Vector3(0, 1.4, -1)));

  // hover raycast
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(artworkMeshes.map((a) => a.mesh), true);

  if (hits.length > 0) {
    const hitMesh = hits[0].object;
    const entry = artworkMeshes.find((a) => {
      let found = false;
      a.mesh.traverse((o) => { if (o === hitMesh) found = true; });
      return found;
    });
    if (entry && entry !== hovered) {
      showTooltip(entry, lastPointerClient.x, lastPointerClient.y);
    } else if (entry && tooltipEl) {
      tooltipEl.style.left = lastPointerClient.x + 'px';
      tooltipEl.style.top = (lastPointerClient.y - 14) + 'px';
    }
    document.body.style.cursor = 'pointer';
  } else {
    if (hovered) hideTooltip();
    document.body.style.cursor = 'default';
  }

  renderer.render(scene, camera);
}
