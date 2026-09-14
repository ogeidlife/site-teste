/**
 * AssetLibrary.js
 * Painel visual da biblioteca de assets GLB. Permite importar novos
 * arquivos, ver a lista de assets já importados, renomear, excluir, e
 * "colocar no mapa" (cria uma instância via AssetManager + SceneManager
 * no centro da cena, pronta para o usuário mover com o gizmo).
 */

import { el, formatBytes } from '../core/Utils.js';
import { bus } from '../core/EventBus.js';
import { AssetManager } from '../systems/AssetManager.js';
import { SceneManager } from '../systems/SceneManager.js';

export class AssetLibrary {
  constructor(root) {
    this.root = root;
    this._build();

    bus.on('asset:imported', () => this._renderList());
    bus.on('asset:removed', () => this._renderList());
    bus.on('asset:renamed', () => this._renderList());
  }

  _build() {
    this.root.innerHTML = '';

    const importInput = el('input', {
      type: 'file',
      accept: '.glb,.gltf',
      multiple: 'multiple',
      style: 'display:none',
      onChange: async (e) => {
        const files = [...e.target.files];
        for (const file of files) {
          try {
            await AssetManager.importFromFile(file);
          } catch (err) {
            console.error(err);
            alert(`Falha ao importar "${file.name}": modelo GLB inválido ou corrompido.`);
          }
        }
        e.target.value = '';
      },
    });

    const importBtn = el(
      'button',
      { class: 'btn btn-accent btn-block', onClick: () => importInput.click() },
      '+ IMPORTAR GLB'
    );

    this.listEl = el('div', { class: 'asset-list' });

    this.root.append(
      el('div', { class: 'panel-block' }, [importBtn, importInput]),
      el('div', { class: 'panel-block' }, [el('h4', { class: 'group-title' }, 'BIBLIOTECA DE ASSETS'), this.listEl])
    );

    this._renderList();
  }

  _renderList() {
    this.listEl.innerHTML = '';
    const assets = AssetManager.getAll();

    if (!assets.length) {
      this.listEl.append(el('p', { class: 'muted small' }, 'Nenhum asset importado ainda.'));
      return;
    }

    for (const asset of assets) {
      const nameInput = el('input', {
        type: 'text',
        value: asset.name,
        class: 'asset-name-input',
        onChange: (e) => AssetManager.rename(asset.id, e.target.value),
      });

      const meta = el('div', { class: 'asset-meta' }, [
        `${formatBytes(asset.sizeBytes)}`,
        asset.animations.length ? ` · ${asset.animations.length} anim.` : '',
      ]);

      const placeBtn = el(
        'button',
        {
          class: 'btn btn-mini',
          title: 'Colocar no mapa',
          onClick: () => bus.emit('assetLibrary:placeRequested', asset.id),
        },
        '+ MAPA'
      );

      const removeBtn = el(
        'button',
        {
          class: 'btn btn-mini btn-danger',
          title: 'Excluir asset',
          onClick: async () => {
            if (confirm(`Excluir "${asset.name}" da biblioteca? Isso não remove instâncias já colocadas no mapa.`)) {
              await AssetManager.remove(asset.id);
            }
          },
        },
        '✕'
      );

      const card = el('div', { class: 'asset-card' }, [
        el('div', { class: 'asset-card-icon' }, '▣'),
        el('div', { class: 'asset-card-body' }, [nameInput, meta]),
        el('div', { class: 'asset-card-actions' }, [placeBtn, removeBtn]),
      ]);

      this.listEl.append(card);
    }
  }
}
