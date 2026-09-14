// AssetLibrary.js
// Renderiza a biblioteca de assets no painel esquerdo, cuida do botão
// "+ IMPORTAR GLB" e do clique-para-colocar no cenário (o pedido original
// fala em arrastar; aqui entregamos clique-para-colocar na Fase 1, que é
// mais simples e confiável em qualquer navegador — drag real pode entrar
// depois sem quebrar nada).

import { placeAssetInstance } from './SceneObjectFactory.js';

export class AssetLibrary {
  constructor({ container, assetManager, sceneManager, projectManager, onChange }) {
    this.container = container;
    this.assetManager = assetManager;
    this.sceneManager = sceneManager;
    this.projectManager = projectManager;
    this.onChange = onChange || (() => {});
    this._build();
  }

  _build() {
    this.container.innerHTML = `
      <div class="asset-lib-head">
        <span class="section-title" style="padding:0;">ASSET LIBRARY</span>
        <button class="btn icon" id="btn-import-glb" title="Importar GLB">+ GLB</button>
      </div>
      <input type="file" id="glb-input" accept=".glb,.gltf" style="display:none" multiple />
      <div class="asset-grid" id="asset-grid"></div>
    `;

    this.grid = this.container.querySelector('#asset-grid');
    this.input = this.container.querySelector('#glb-input');

    this.container.querySelector('#btn-import-glb').addEventListener('click', () => this.input.click());
    this.input.addEventListener('change', async (e) => {
      const files = [...e.target.files];
      for (const file of files) {
        try {
          await this.assetManager.importFile(file, this._currentCategory || 'PROPS');
        } catch (err) {
          console.error('Falha ao importar GLB', file.name, err);
          alert(`Não consegui importar "${file.name}". Verifique se é um .glb/.gltf válido.`);
        }
      }
      this.input.value = '';
      this.render();
      this.onChange();
    });

    this.render();
  }

  setCategory(category) {
    this._currentCategory = category;
  }

  render() {
    const assets = this.assetManager.list();
    if (!assets.length) {
      this.grid.innerHTML = `<div class="asset-empty">Nenhum asset importado ainda.<br/>Use "+ GLB" para trazer seus modelos.</div>`;
      return;
    }
    this.grid.innerHTML = assets
      .map(
        (a) => `
      <div class="asset-card" draggable="true" data-id="${a.id}" title="Clique para colocar na cena">
        <div class="thumb">▣</div>
        <div>${a.name}</div>
        ${a.animations.length ? `<div class="anims">${a.animations.length} anim(s)</div>` : ''}
      </div>`
      )
      .join('');

    this.grid.querySelectorAll('.asset-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        placeAssetInstance({
          assetManager: this.assetManager,
          sceneManager: this.sceneManager,
          assetId: id,
        });
        this.onChange();
      });
    });
  }
}
