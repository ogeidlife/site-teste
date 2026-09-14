/**
 * main.js (configurador)
 * Ponto de entrada da FASE 1 do OGEID GAME CONFIGURATOR.
 * Monta o layout (toolbar + painel esquerdo + viewport + inspector),
 * instancia os sistemas (SceneManager, AssetManager, ProjectManager,
 * EditorScene) e conecta tudo via EventBus.
 */

import { el } from '../core/Utils.js';
import { bus } from '../core/EventBus.js';
import { CATEGORIES, LAYERS } from '../core/Constants.js';
import { AssetManager } from '../systems/AssetManager.js';
import { SceneManager } from '../systems/SceneManager.js';
import { EditorScene } from './EditorScene.js';
import { AssetLibrary } from './AssetLibrary.js';
import { Inspector } from './Inspector.js';
import { ProjectManager } from './ProjectManager.js';

const app = document.getElementById('app');

// ---------------------------------------------------------------------
// Layout raiz
// ---------------------------------------------------------------------
const topbar = el('header', { class: 'topbar' });
const body = el('div', { class: 'app-body' });
const leftPanel = el('aside', { class: 'panel panel-left' });
const viewportWrap = el('main', { class: 'viewport-wrap' });
const rightPanel = el('aside', { class: 'panel panel-right' });

body.append(leftPanel, viewportWrap, rightPanel);
app.append(topbar, body);

// ---------------------------------------------------------------------
// Topbar
// ---------------------------------------------------------------------
const projectNameEl = el('span', { class: 'project-name' }, ProjectManager.currentProjectName);
const statusEl = el('span', { class: 'save-status' }, '');

function buildTopbar() {
  const brand = el('div', { class: 'brand' }, [
    el('span', { class: 'brand-mark' }, 'OGEID'),
    el('span', { class: 'brand-sub' }, 'GAME CONFIGURATOR'),
  ]);

  const projectMenu = el('div', { class: 'project-block' }, [projectNameEl, statusEl]);

  const fileImport = el('input', {
    type: 'file',
    accept: '.json',
    style: 'display:none',
    onChange: async (e) => {
      const file = e.target.files[0];
      if (file) await ProjectManager.importJSON(file);
      e.target.value = '';
    },
  });

  const fileButtons = el('div', { class: 'toolbar-group' }, [
    el('button', { class: 'btn btn-ghost', onClick: () => ProjectManager.newProject() }, 'NEW'),
    el('button', { class: 'btn btn-ghost', onClick: () => ProjectManager.save().then(showSaved) }, 'SAVE'),
    el('button', { class: 'btn btn-ghost', onClick: () => ProjectManager.saveAs().then(showSaved) }, 'SAVE AS'),
    el('button', { class: 'btn btn-ghost', onClick: openLoadMenu }, 'LOAD'),
    el('button', { class: 'btn btn-ghost', onClick: () => ProjectManager.exportJSON() }, 'EXPORT JSON'),
    el('button', { class: 'btn btn-ghost', onClick: () => fileImport.click() }, 'IMPORT JSON'),
    el('button', { class: 'btn btn-ghost btn-danger-outline', onClick: () => ProjectManager.reset() }, 'RESET'),
    fileImport,
  ]);

  const transformButtons = el('div', { class: 'toolbar-group' }, [
    el('button', { class: 'btn btn-mode', dataset: { mode: 'translate' }, onClick: () => bus.emit('toolbar:transformMode', 'translate') }, 'MOVE (W)'),
    el('button', { class: 'btn btn-mode', dataset: { mode: 'rotate' }, onClick: () => bus.emit('toolbar:transformMode', 'rotate') }, 'ROTATE (E)'),
    el('button', { class: 'btn btn-mode', dataset: { mode: 'scale' }, onClick: () => bus.emit('toolbar:transformMode', 'scale') }, 'SCALE (R)'),
  ]);

  const snapToggle = el('label', { class: 'field-label checkbox-label' }, [
    el('input', { type: 'checkbox', onChange: (e) => bus.emit('toolbar:snapToggled', e.target.checked) }),
    ' SNAP',
  ]);

  const playBtn = el(
    'button',
    { class: 'btn btn-play', disabled: 'disabled', title: 'PLAY MODE chega na Fase 2 (Player + Câmera)' },
    '▶ PLAY'
  );

  topbar.append(brand, projectMenu, transformButtons, snapToggle, fileButtons, playBtn);

  bus.on('transform:modeChanged', (mode) => {
    topbar.querySelectorAll('.btn-mode').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  });
  topbar.querySelector('.btn-mode[data-mode="translate"]')?.classList.add('active');
}

function showSaved() {
  statusEl.textContent = 'salvo ✓';
  projectNameEl.textContent = ProjectManager.currentProjectName;
  setTimeout(() => (statusEl.textContent = ''), 1500);
}

async function openLoadMenu() {
  const projects = await ProjectManager.listProjects();
  if (!projects.length) {
    alert('Nenhum projeto salvo ainda (além do autosave).');
    return;
  }
  const listText = projects.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
  const choice = prompt(`Digite o número do projeto para carregar:\n\n${listText}`);
  const index = parseInt(choice, 10) - 1;
  if (projects[index]) {
    await ProjectManager.loadProjectById(projects[index].id);
    projectNameEl.textContent = ProjectManager.currentProjectName;
  }
}

bus.on('project:loaded', () => (projectNameEl.textContent = ProjectManager.currentProjectName));
bus.on('project:new', () => (projectNameEl.textContent = ProjectManager.currentProjectName));

// ---------------------------------------------------------------------
// Painel esquerdo: categorias
// ---------------------------------------------------------------------
const categoryTabs = el('nav', { class: 'category-tabs' });
const categoryContent = el('div', { class: 'category-content' });
leftPanel.append(categoryTabs, categoryContent);

let activeCategory = 'cenario';
let editorSceneRef = null;

function buildCategoryTabs() {
  categoryTabs.innerHTML = '';
  for (const cat of CATEGORIES) {
    const enabled = cat.phase === 1;
    const tab = el(
      'button',
      {
        class: `category-tab${cat.id === activeCategory ? ' active' : ''}${enabled ? '' : ' locked'}`,
        onClick: () => selectCategory(cat.id),
      },
      [el('span', {}, cat.label), enabled ? null : el('span', { class: 'phase-tag' }, `F${cat.phase}`)]
    );
    categoryTabs.append(tab);
  }
}

function selectCategory(id) {
  activeCategory = id;
  buildCategoryTabs();
  renderCategoryContent(id);
}

function renderCategoryContent(id) {
  categoryContent.innerHTML = '';
  const cat = CATEGORIES.find((c) => c.id === id);

  if (id === 'cenario') {
    categoryContent.append(buildCenarioPanel());
    if (editorSceneRef) {
      editorSceneRef.outlinerEl = window._ogeidOutliner;
      editorSceneRef._renderOutliner();
    }
    return;
  }
  if (id === 'objetos') {
    const assetLibraryRoot = el('div');
    new AssetLibrary(assetLibraryRoot);
    categoryContent.append(assetLibraryRoot);
    return;
  }
  if (id === 'iluminacao') {
    categoryContent.append(buildLightingPanel());
    return;
  }

  categoryContent.append(
    el('div', { class: 'panel-block locked-block' }, [
      el('p', {}, `"${cat.label}" chega na Fase ${cat.phase}.`),
      el('p', { class: 'muted small' }, 'Veja o roteiro de fases no README do projeto.'),
    ])
  );
}

function buildCenarioPanel() {
  const wrap = el('div');

  // Outliner (lista de objetos do mundo)
  const outliner = el('div', { class: 'outliner' });
  wrap.append(el('div', { class: 'panel-block' }, [el('h4', { class: 'group-title' }, 'OBJETOS NA CENA'), outliner]));

  // Layers
  const layerList = el(
    'div',
    { class: 'layer-list' },
    LAYERS.map((layer) =>
      el('label', { class: 'field-label checkbox-label' }, [
        el('input', {
          type: 'checkbox',
          checked: 'checked',
          onChange: (e) => bus.emit('toolbar:layerVisibility', { layer, visible: e.target.checked }),
        }),
        ` ${layer}`,
      ])
    )
  );
  wrap.append(el('div', { class: 'panel-block' }, [el('h4', { class: 'group-title' }, 'LAYERS'), layerList]));

  wrap.append(
    el('div', { class: 'panel-block' }, [
      el('h4', { class: 'group-title' }, 'ATALHOS'),
      el('ul', { class: 'shortcut-list' }, [
        el('li', {}, 'W / E / R — mover / rotacionar / escalar'),
        el('li', {}, 'Ctrl/Cmd + D — duplicar selecionado'),
        el('li', {}, 'Delete — excluir selecionado'),
        el('li', {}, 'Esc — limpar seleção'),
        el('li', {}, 'Clique + arraste — orbitar câmera'),
        el('li', {}, 'Scroll — zoom'),
      ]),
    ])
  );

  window._ogeidOutliner = outliner;
  return wrap;
}

function buildLightingPanel() {
  const wrap = el('div', { class: 'panel-block' });

  const slider = (label, min, max, step, value, onInput) => {
    const input = el('input', { type: 'range', min, max, step, value, class: 'slider', onInput: (e) => onInput(parseFloat(e.target.value)) });
    return el('div', { class: 'inspector-section' }, [el('label', { class: 'field-label' }, label), input]);
  };

  wrap.append(
    el('h4', { class: 'group-title' }, 'WORLD LIGHT'),
    slider('AMBIENT INTENSITY', 0, 2, 0.05, SceneManager.ambientLight.intensity, (v) => (SceneManager.ambientLight.intensity = v)),
    slider('SUN INTENSITY', 0, 3, 0.05, SceneManager.sunLight.intensity, (v) => (SceneManager.sunLight.intensity = v)),
    slider('FOG DENSITY', 0, 0.05, 0.001, SceneManager.scene.fog.density, (v) => (SceneManager.scene.fog.density = v))
  );

  return wrap;
}

// ---------------------------------------------------------------------
// Viewport + Inspector
// ---------------------------------------------------------------------
function buildViewport() {
  const canvasHost = el('div', { class: 'viewport-canvas-host' });
  const hint = el('div', { class: 'viewport-hint' }, 'Clique em um objeto para selecionar · Arraste para orbitar');
  viewportWrap.append(canvasHost, hint);
  return canvasHost;
}

function buildInspectorPanel() {
  const title = el('h3', { class: 'panel-title' }, 'INSPECTOR');
  const inspectorRoot = el('div', { class: 'inspector-root' });
  rightPanel.append(title, inspectorRoot);
  return inspectorRoot;
}

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------
async function boot() {
  buildTopbar();
  buildCategoryTabs();
  renderCategoryContent(activeCategory);

  const canvasHost = buildViewport();
  const inspectorRoot = buildInspectorPanel();

  await AssetManager.hydrateFromDB();

  // O painel CENÁRIO (renderizado acima) já criou o elemento do outliner.
  const editorScene = new EditorScene({ viewportEl: canvasHost, outlinerEl: window._ogeidOutliner });
  editorSceneRef = editorScene;

  new Inspector(inspectorRoot);

  ProjectManager.init();
  await ProjectManager.loadLastOrAutosave();

  projectNameEl.textContent = ProjectManager.currentProjectName;
}

boot();
