import * as THREE from 'three';
import { enterGallery, exitGallery, updateGallery, isInGallery } from './gallery.js';

// ---------- Renderer / Scene / Camera ----------
const canvas = document.getElementById('scene-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const worldScene = new THREE.Scene();
worldScene.background = new THREE.Color(0x0c0e12);
worldScene.fog = new THREE.Fog(0x0c0e12, 20, 70);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

// ---------- Lights ----------
const hemi = new THREE.HemisphereLight(0x8899aa, 0x14171c, 0.9);
worldScene.add(hemi);
const moon = new THREE.DirectionalLight(0xcbd5ff, 0.8);
moon.position.set(-10, 18, -6);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
worldScene.add(moon);

// ---------- Ground ----------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: 0x1a1e25, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
worldScene.add(ground);

// faint grid for scale reference
const grid = new THREE.GridHelper(120, 60, 0x2a2f3a, 0x20242c);
grid.position.y = 0.01;
worldScene.add(grid);

// ---------- Buildings ----------
// Each building is a simple volume with a glowing "door" trigger zone.
// Extend this array to add more pages (Sobre, Contato, etc).
const brassMat = new THREE.MeshStandardMaterial({ color: 0xb08d57, emissive: 0x3a2a10, emissiveIntensity: 0.4 });
const wallMat = new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: 0.9 });

function makeBuilding({ x, z, w, d, h, label, enterable }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  box.position.y = h / 2;
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);

  const doorGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.5, h * 0.5),
    brassMat
  );
  doorGlow.position.set(0, h * 0.28, d / 2 + 0.02);
  group.add(doorGlow);

  worldScene.add(group);

  return {
    label,
    enterable,
    position: new THREE.Vector3(x, 0, z),
    triggerRadius: Math.max(w, d) / 2 + 2.2,
  };
}

const galleryBuilding = makeBuilding({ x: 0, z: -18, w: 12, d: 10, h: 6, label: 'Galeria', enterable: true });
makeBuilding({ x: -16, z: -8, w: 8, d: 8, h: 5, label: 'Sobre', enterable: false });
makeBuilding({ x: 16, z: -8, w: 8, d: 8, h: 5, label: 'Contato', enterable: false });

const buildings = [galleryBuilding];

// ---------- Character ----------
const character = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.4, 0.8, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0xefe8db })
);
body.position.y = 0.8;
body.castShadow = true;
character.add(body);
character.position.set(0, 0, 6);
worldScene.add(character);

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

const moveSpeed = 6; // units per second
const clock = new THREE.Clock();

const hintEl = document.getElementById('hint');
const badgeEl = document.getElementById('gallery-badge');

function updateWorld(dt) {
  let dx = 0, dz = 0;
  if (keys['w'] || keys['arrowup']) dz -= 1;
  if (keys['s'] || keys['arrowdown']) dz += 1;
  if (keys['a'] || keys['arrowleft']) dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;

  if (dx !== 0 || dz !== 0) {
    const len = Math.hypot(dx, dz);
    dx /= len; dz /= len;
    character.position.x += dx * moveSpeed * dt;
    character.position.z += dz * moveSpeed * dt;
    character.rotation.y = Math.atan2(dx, dz);
  }

  // clamp to ground bounds
  character.position.x = THREE.MathUtils.clamp(character.position.x, -55, 55);
  character.position.z = THREE.MathUtils.clamp(character.position.z, -55, 55);

  // camera follows, slightly above and behind
  const camOffset = new THREE.Vector3(0, 6, 9);
  const desiredCamPos = character.position.clone().add(camOffset);
  camera.position.lerp(desiredCamPos, 1 - Math.pow(0.001, dt));
  camera.lookAt(character.position.clone().add(new THREE.Vector3(0, 1, 0)));

  // check building triggers
  let nearEnterable = null;
  for (const b of buildings) {
    const dist = character.position.distanceTo(b.position);
    if (dist < b.triggerRadius) nearEnterable = b;
  }

  if (nearEnterable) {
    hintEl.textContent = `Pressione E para entrar em "${nearEnterable.label}".`;
    if (keys['e']) {
      keys['e'] = false;
      goIntoGallery();
    }
  } else {
    hintEl.textContent = 'Use as setas ou W A S D para andar. Aproxime-se de uma construção para entrar.';
  }
}

function goIntoGallery() {
  enterGallery(renderer, camera);
  badgeEl.classList.remove('hidden');
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isInGallery()) {
    exitGallery(camera);
    badgeEl.classList.add('hidden');
  }
});

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Main loop ----------
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (isInGallery()) {
    updateGallery(dt, renderer, camera);
  } else {
    updateWorld(dt);
    renderer.render(worldScene, camera);
  }
}

animate();
