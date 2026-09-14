import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let artworks = [];
let selectedGlbName = '';

const el = (id) => document.getElementById(id);
const form = el('art-form');
const listEl = el('art-list');

function render() {
  listEl.innerHTML = '';
  artworks.forEach((a, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="meta">
        <strong>${a.title}</strong>
        <span>${a.type} · R$ ${Number(a.price).toFixed(2).replace('.', ',')} · ${a.glb}</span>
      </div>
      <div>
        <button data-action="edit" data-i="${i}">Editar</button>
        <button data-action="remove" data-i="${i}">Remover</button>
      </div>
    `;
    listEl.appendChild(li);
  });
}

listEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const i = Number(btn.dataset.i);
  if (btn.dataset.action === 'remove') {
    artworks.splice(i, 1);
    render();
  } else if (btn.dataset.action === 'edit') {
    loadIntoForm(i);
  }
});

function loadIntoForm(i) {
  const a = artworks[i];
  el('edit-index').value = i;
  el('id').value = a.id;
  el('title').value = a.title;
  el('type').value = a.type;
  el('price').value = a.price;
  el('artist').value = a.artist || '';
  el('description').value = a.description || '';
  el('posX').value = a.position.x;
  el('posY').value = a.position.y;
  el('posZ').value = a.position.z;
  el('rotY').value = THREE.MathUtils.radToDeg(a.rotation.y);
  el('scale').value = a.scale;
  selectedGlbName = a.glb.split('/').pop();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const idx = el('edit-index').value;
  const type = el('type').value;
  const glbName = selectedGlbName || `${el('id').value}.glb`;

  const entry = {
    id: el('id').value.trim(),
    title: el('title').value.trim(),
    type,
    artist: el('artist').value.trim() || 'Sem artista definido',
    price: parseFloat(el('price').value) || 0,
    description: el('description').value.trim(),
    glb: `assets/models/${glbName}`,
    placeholder: type === 'Escultura' ? 'sculpture' : 'painting',
    position: {
      x: parseFloat(el('posX').value) || 0,
      y: parseFloat(el('posY').value) || 0,
      z: parseFloat(el('posZ').value) || 0,
    },
    rotation: { x: 0, y: THREE.MathUtils.degToRad(parseFloat(el('rotY').value) || 0), z: 0 },
    scale: parseFloat(el('scale').value) || 1,
  };

  if (idx !== '') {
    artworks[Number(idx)] = entry;
  } else {
    artworks.push(entry);
  }

  form.reset();
  el('edit-index').value = '';
  el('glb-preview').style.display = 'none';
  selectedGlbName = '';
  render();
});

el('clear-btn').addEventListener('click', () => {
  if (confirm('Remover todas as peças da lista atual?')) {
    artworks = [];
    render();
  }
});

el('export-btn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ artworks }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'artworks.json';
  a.click();
  URL.revokeObjectURL(url);
});

el('import-json').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const parsed = JSON.parse(text);
    artworks = parsed.artworks || [];
    render();
  } catch (err) {
    alert('Não foi possível ler esse arquivo JSON.');
  }
});

// ---------- GLB preview ----------
let previewRenderer, previewScene, previewCamera, previewControls;

function ensurePreviewViewer() {
  if (previewRenderer) return;
  const container = el('glb-preview');
  previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  previewRenderer.setSize(container.clientWidth, 200);
  container.appendChild(previewRenderer.domElement);

  previewScene = new THREE.Scene();
  previewCamera = new THREE.PerspectiveCamera(45, container.clientWidth / 200, 0.1, 100);
  previewCamera.position.set(0, 1, 3.5);

  previewScene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 1));
  const dl = new THREE.DirectionalLight(0xffffff, 1);
  dl.position.set(3, 5, 4);
  previewScene.add(dl);

  previewControls = new OrbitControls(previewCamera, previewRenderer.domElement);
  previewControls.enableDamping = true;

  (function animate() {
    requestAnimationFrame(animate);
    previewControls.update();
    previewRenderer.render(previewScene, previewCamera);
  })();
}

el('glbFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedGlbName = file.name;

  ensurePreviewViewer();
  el('glb-preview').style.display = 'block';

  // clear previous model
  previewScene.children = previewScene.children.filter(
    (c) => c.type === 'HemisphereLight' || c.type === 'DirectionalLight'
  );

  const url = URL.createObjectURL(file);
  const loader = new GLTFLoader();
  loader.load(url, (gltf) => {
    previewScene.add(gltf.scene);
    URL.revokeObjectURL(url);
  }, undefined, (err) => {
    console.error('Não foi possível carregar o .glb', err);
  });
});

render();
