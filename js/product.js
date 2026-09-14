import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ------------------------------------------------------------------
// CONFIGURE AQUI: crie uma conta gratuita em https://www.emailjs.com
// e cole os 3 IDs abaixo. O pedido será enviado direto para o email
// cadastrado no seu template do EmailJS — não precisa de servidor.
// ------------------------------------------------------------------
const EMAILJS_PUBLIC_KEY = 'COLE_SUA_PUBLIC_KEY_AQUI';
const EMAILJS_SERVICE_ID = 'COLE_SEU_SERVICE_ID_AQUI';
const EMAILJS_TEMPLATE_ID = 'COLE_SEU_TEMPLATE_ID_AQUI';

if (window.emailjs) {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

const els = {
  kind: document.getElementById('p-kind'),
  title: document.getElementById('p-title'),
  artist: document.getElementById('p-artist'),
  description: document.getElementById('p-description'),
  price: document.getElementById('p-price'),
  form: document.getElementById('order-form'),
  status: document.getElementById('form-status'),
};

let currentArt = null;

async function loadArtwork() {
  const res = await fetch('data/artworks.json');
  const { artworks } = await res.json();
  const art = artworks.find((a) => a.id === id);

  if (!art) {
    els.title.textContent = 'Peça não encontrada';
    els.form.style.display = 'none';
    return;
  }

  currentArt = art;
  els.kind.textContent = art.type;
  els.title.textContent = art.title;
  els.artist.textContent = art.artist;
  els.description.textContent = art.description;
  els.price.textContent = `R$ ${art.price.toFixed(2).replace('.', ',')}`;
  document.title = `${art.title} — Ateliê`;

  initViewer(art);
}

// ---------- 3D viewer for the individual piece ----------
function initViewer(art) {
  const container = document.getElementById('viewer');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 1, 4);

  const hemi = new THREE.HemisphereLight(0xfff2e0, 0x14100a, 0.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffe6c0, 1);
  key.position.set(3, 5, 4);
  scene.add(key);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.4;
  controls.enablePan = false;
  controls.minDistance = 2;
  controls.maxDistance = 8;

  const loader = new GLTFLoader();
  loader.load(
    art.glb,
    (gltf) => { scene.add(gltf.scene); },
    undefined,
    () => { scene.add(placeholderMesh(art.placeholder)); }
  );

  function placeholderMesh(type) {
    if (type === 'sculpture' || type === 'Escultura') {
      const geo = new THREE.TorusKnotGeometry(0.6, 0.2, 100, 16);
      const mat = new THREE.MeshStandardMaterial({ color: 0xb08d57, metalness: 0.6, roughness: 0.3 });
      return new THREE.Mesh(geo, mat);
    }
    const group = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.08), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.0), new THREE.MeshStandardMaterial({ color: 0x8899aa }));
    canvasMesh.position.z = 0.045;
    group.add(frame, canvasMesh);
    return group;
  }

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  (function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  })();
}

// ---------- Order form -> EmailJS ----------
els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  els.status.textContent = '';
  els.status.className = 'form-status';

  if (!window.emailjs || EMAILJS_PUBLIC_KEY.startsWith('COLE_')) {
    els.status.textContent = 'Configure suas chaves do EmailJS em js/product.js para ativar o envio.';
    els.status.className = 'form-status err';
    return;
  }

  const formData = new FormData(els.form);
  const templateParams = {
    artwork_title: currentArt.title,
    artwork_price: `R$ ${currentArt.price.toFixed(2).replace('.', ',')}`,
    artwork_id: currentArt.id,
    customer_name: formData.get('name'),
    customer_email: formData.get('email'),
    customer_address: formData.get('address'),
    customer_message: formData.get('message'),
  };

  els.status.textContent = 'Enviando pedido…';

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
    els.status.textContent = 'Pedido enviado! Em breve entraremos em contato.';
    els.status.className = 'form-status ok';
    els.form.reset();
  } catch (err) {
    console.error(err);
    els.status.textContent = 'Não foi possível enviar. Tente novamente em instantes.';
    els.status.className = 'form-status err';
  }
});

loadArtwork();
