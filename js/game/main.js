// main.js (game.html)
// PLAY MODE. Carrega o projeto salvo pelo Configurador (mesmo localStorage +
// IndexedDB), reconstrói a cena (sem gizmos/orbit — câmera de jogo de verdade),
// spawna o player com o PlayerController + CameraController, liga o
// InputManager (teclado/joystick) e desenha um HUD mínimo. Guard AI, câmeras
// de segurança, missões e vídeos entram nas próximas fases — a UI já reserva
// os espaços (ver comentários "FASE X").

import * as THREE from 'three';
import { AssetManager } from '../core/AssetManager.js';
import { ProjectManager } from '../core/ProjectManager.js';
import { InputManager } from './InputManager.js';
import { PlayerController } from './PlayerController.js';
import { CameraController } from './CameraController.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';

const root = document.getElementById('game-root');

function showStub() {
  root.innerHTML = `
    <div class="stub-card">
      <h1>NENHUM PROJETO ENCONTRADO</h1>
      <p>Monte seu mapa no Configurador e clique em <strong>▶ PLAY</strong> — isso salva o projeto e abre o jogo aqui.</p>
      <a class="btn" href="configurador.html">← ABRIR CONFIGURADOR</a>
    </div>`;
}

async function boot() {
  const projectManager = new ProjectManager();
  if (!projectManager.hasSavedProject()) return showStub();
  const project = projectManager.load();

  const assetManager = new AssetManager();
  await assetManager.hydrateFromProject(project.assets);

  // ---------- cena de jogo (própria, sem OrbitControls/gizmos) ----------
  root.innerHTML = `
    <div id="viewport-game"></div>
    <div id="hud">
      <div id="hud-topleft">
        <div class="hud-bar-row">HP <div class="hud-bar"><div class="hud-bar-fill" style="width:100%"></div></div></div>
        <div class="hud-bar-row">ENERGY <div class="hud-bar"><div class="hud-bar-fill" style="width:100%;background:#3ddc84;"></div></div></div>
      </div>
      <div id="debug-panel"></div>
      <div id="esc-hint">ESC — voltar ao configurador</div>
    </div>
  `;
  // Mission panel / minimap / inventory / camera feed = FASE 6/7/8 (UI editor cuida do layout)

  const viewportEl = root.querySelector('#viewport-game');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0b0d);
  scene.fog = new THREE.FogExp2(0x0a0b0d, 0.018);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  viewportEl.appendChild(renderer.domElement);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const sc = project.scene;
  scene.add(new THREE.HemisphereLight(sc.ambient.color, 0x0a0a0c, sc.ambient.intensity));
  const dir = new THREE.DirectionalLight(sc.directional.color, sc.directional.intensity);
  dir.position.set(...sc.directional.position);
  dir.castShadow = true;
  scene.add(dir);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(sc.grid.size, sc.grid.size),
    new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- reconstrói objetos do mapa (Fase 1: tudo é estático por enquanto) ----------
  const objectsById = new Map();
  for (const o of project.objects) {
    let object3D = null;
    if (o.assetId && assetManager.get(o.assetId)) {
      const instance = assetManager.createInstance(o.assetId);
      object3D = instance.object3D;
      object3D.userData.mixer = instance.mixer;
      object3D.userData.clips = instance.clips;
    } else if (o.primitive) {
      object3D = buildPrimitive(o.primitive);
    }
    if (!object3D) continue;
    object3D.position.fromArray(o.position);
    object3D.rotation.set(...o.rotation);
    object3D.scale.fromArray(o.scale);
    object3D.userData.ogeidId = o.id;
    object3D.userData.ogeidData = o;
    scene.add(object3D);
    objectsById.set(o.id, object3D);
  }

  // ---------- fake SceneManager pra reaproveitar o CollisionSystem ----------
  const sceneManagerLike = { objects: objectsById };
  const collisionSystem = new CollisionSystem(sceneManagerLike);

  // ---------- player ----------
  let playerEntry = [...objectsById.values()].find((o) => o.userData.ogeidData?.category === 'PERSONAGEM');
  if (!playerEntry) {
    // nenhum objeto PERSONAGEM no mapa: cria um placeholder na origem pra não travar o teste
    playerEntry = buildPrimitive('CAPSULE');
    playerEntry.position.set(0, 0.9, 0);
    scene.add(playerEntry);
  }

  const input = new InputManager({ mobileRoot: root });
  const player = new PlayerController({
    object3D: playerEntry,
    mixer: playerEntry.userData.mixer || null,
    clips: playerEntry.userData.clips || [],
    config: project.player,
    input,
    collisionSystem,
  });

  const cameraController = new CameraController({ camera, config: project.camera });
  renderer.domElement.addEventListener('wheel', (e) => cameraController.handleWheel(e.deltaY));

  // ---------- ESC volta pro configurador ----------
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.location.href = 'configurador.html';
  });

  // ---------- debug (FASE 9 completa isso: guard state, detection, etc.) ----------
  let debugOn = false;
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'f3') {
      debugOn = !debugOn;
      root.querySelector('#debug-panel').classList.toggle('visible', debugOn);
    }
  });

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    player.update(dt);
    cameraController.update(playerEntry.position, dt);

    if (debugOn) {
      root.querySelector('#debug-panel').innerHTML = `
        FPS: ${(1 / dt).toFixed(0)}<br/>
        POS: ${playerEntry.position.x.toFixed(1)}, ${playerEntry.position.y.toFixed(1)}, ${playerEntry.position.z.toFixed(1)}<br/>
        OBJECTS: ${objectsById.size}<br/>
        MISSION: — (Fase 6)<br/>
        GUARD: — (Fase 3)
      `;
    }

    renderer.render(scene, camera);
  }
  animate();
}

function buildPrimitive(kind) {
  const geo = {
    BOX: () => new THREE.BoxGeometry(1, 1, 1),
    WALL: () => new THREE.BoxGeometry(3, 2.4, 0.2),
    PLANE: () => new THREE.PlaneGeometry(2, 2),
    CAPSULE: () => new THREE.CapsuleGeometry(0.35, 1, 4, 8),
    SPHERE: () => new THREE.SphereGeometry(0.5, 16, 16),
  }[kind]?.() || new THREE.BoxGeometry(1, 1, 1);
  const color = { BOX: 0x3a3d44, WALL: 0x2c2e33, PLANE: 0x8a8d93, CAPSULE: 0xff3d7f, SPHERE: 0xffb020 }[kind] ?? 0x555555;
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

boot();
