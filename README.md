# OGEID GAME CONFIGURATOR

Configurador/engine baseado em navegador para um jogo 3D de graffiti urbano
(câmera isométrica/top-down, estética industrial noturna). Este pacote
entrega a **FASE 1**: editor 3D completo, importação de modelos GLB e
transformação de objetos. As fases seguintes (player, guards, câmeras,
graffiti, missões, UI do jogo, save/load) usam a mesma arquitetura.

---

## Como rodar

O projeto **não tem build step** (sem npm/webpack/etc), mas precisa ser
servido por HTTP — abrir `index.html` direto com `file://` não funciona
porque os ES Modules e o `fetch` de assets são bloqueados pelo navegador
nesse esquema.

Qualquer servidor estático simples resolve. Exemplos:

```bash
# Python (já vem em quase todo sistema)
cd ogeid-game
python3 -m http.server 8080
# depois abra http://localhost:8080

# ou Node
npx serve .

# ou VS Code: extensão "Live Server"
```

Depois é só abrir `index.html` → **ABRIR CONFIGURADOR**.

Também funciona hospedado direto no **GitHub Pages**: suba a pasta
`ogeid-game/` como raiz do repositório (ou configure o Pages para servir
a partir dela) — não há dependências externas além de CDNs públicas
(Three.js via unpkg, fontes via Google Fonts).

---

## O que já funciona (Fase 1)

- Viewport 3D (Three.js) com câmera orbital, grid, chão, iluminação
  noturna de referência (ambient + directional + rim light magenta).
- **+ IMPORTAR GLB**: importa `.glb`/`.gltf` do seu computador, faz parse,
  detecta animações automaticamente e guarda o binário no **IndexedDB**
  do navegador (sobrevive a fechar/reabrir o navegador).
- **Asset Library** (categoria OBJETOS): lista os modelos importados,
  permite renomear, excluir e colocar no mapa (`+ MAPA`).
- **Seleção e gizmos**: clique num objeto no viewport ou na lista
  "OBJETOS NA CENA" (categoria CENÁRIO) para selecionar. Gizmos de
  **mover / rotacionar / escalar** com atalhos `W` `E` `R`.
- **Inspector** (painel direito): nome, layer, collision, transform
  (position/rotation/scale) com campos numéricos ao vivo, e player de
  animações (se o GLB tiver clips como Idle/Walk/Run/Spray, dá pra
  escolher e testar `▶ PLAY` / `■ STOP` diretamente no editor).
- **Layers**: GROUND / BUILDINGS / PROPS / NPC / LIGHTS / GAMEPLAY —
  cada objeto pertence a uma, com visibilidade independente.
- **Iluminação** (categoria ILUMINAÇÃO): sliders de ambient intensity,
  sun intensity e densidade de fog, em tempo real.
- **Projeto**: NEW / SAVE / SAVE AS / LOAD / EXPORT JSON / IMPORT JSON /
  RESET, com **autosave** automático (a cada mudança, ~900ms de debounce)
  gravado no IndexedDB — ao reabrir o navegador, o último projeto volta
  sozinho.
- Atalhos: `W`/`E`/`R` (modo do gizmo), `Ctrl/Cmd+D` (duplicar),
  `Delete` (excluir), `Esc` (limpar seleção).

O botão **▶ PLAY** já existe na topbar mas fica desabilitado — ele liga
na Fase 2, quando o `PlayerController` e a `CameraController` existirem.

---

## Como adicionar seus GLBs

1. Abra o configurador → categoria **OBJETOS** (painel esquerdo).
2. Clique em **+ IMPORTAR GLB** e selecione um ou mais arquivos
   `.glb`/`.gltf`.
3. O modelo aparece na Asset Library. Clique em **+ MAPA** para colocar
   uma instância na cena — ela nasce perto do centro da câmera, pronta
   para mover com o gizmo.
4. Se o GLB tiver animações (rig), elas aparecem automaticamente no
   Inspector quando você seleciona a instância.
5. Os arquivos `.glb` ficam salvos no IndexedDB do navegador — não é
   necessário copiá-los manualmente para `/assets/`. As pastas em
   `/assets/*` (com `README.md` explicando cada uma) existem para quando
   você quiser versionar os modelos no repositório/GitHub Pages; isso
   será conectado automaticamente a partir da Fase 2 em diante.

**Importante sobre `EXPORT JSON` / `IMPORT JSON`:** o `project.json`
exportado guarda a *disposição do mundo* (quem está onde, com qual
transform), não o binário do GLB (ficaria pesado demais para JSON). Ao
importar esse JSON em outro navegador/sessão, os GLBs referenciados
precisam já estar na Asset Library local — o sistema tenta casar pelo
nome do arquivo automaticamente e avisa quais faltam reimportar.

---

## Arquitetura

```
/ogeid-game/
  index.html            landing simples
  configurador.html      Fase 1: editor 3D completo
  game.html               stub do jogo (Fase 2+)

  /css/
    configurador.css      tema visual do editor
    game.css               stub do tema do jogo

  /js/
    /core/
      EventBus.js          pub/sub central — desacopla todos os módulos
      Constants.js         categorias, layers, chaves de storage
      Utils.js              helpers (uuid, DOM, download, clamp, etc)

    /systems/               lógica pura, sem UI — reaproveitável pelo jogo
      AssetManager.js        import/parse/cache/clone de GLB
      SceneManager.js         Three.js: scene, câmera, luzes, grid, raycast
      SaveSystem.js            IndexedDB (assets + projetos) + localStorage
      CollisionSystem.js       AABB dos objetos sólidos (stub pronto p/ Fase 2)

    /configurator/          UI e orquestração do editor
      EditorScene.js           seleção por clique, highlight, outliner
      AssetLibrary.js           painel da biblioteca de assets
      Inspector.js               painel direito (transform, anim, ações)
      TransformControls.js       wrapper do gizmo (atalhos, snap)
      ProjectManager.js          serialize/save/load/export/import/autosave
      main.js                     monta o layout e liga tudo

    /game/                   vazio — Fase 2+ (PlayerController, GuardAI, ...)
    /ui/                     vazio — Fase 8 (HUD do jogo)

  /assets/                 characters, environment, guards, props, cameras,
                             graffiti, audio, videos — cada uma com README.md
  /configs/                 scene.json, missions.json, ui.json — formatos de
                             referência (o projeto real vive no IndexedDB e é
                             exportado pelo botão EXPORT JSON)
```

### Como os módulos se conectam

- `main.js` monta o DOM (topbar, painéis, viewport) e instancia
  `SceneManager` → `EditorScene` → `Inspector`/`AssetLibrary` →
  `ProjectManager`, todos comunicando por eventos via `EventBus`
  (`js/core/EventBus.js`), não por chamadas diretas amarradas. Isso é o
  que vai permitir plugar `GuardEditor`, `MissionEditor`, `VideoEditor`
  etc nas próximas fases sem reescrever o núcleo.
- `AssetManager` e `SceneManager` não sabem nada de UI/DOM — por isso o
  `game.html` (Fase 2+) vai poder reusar exatamente os mesmos sistemas
  para carregar o mundo salvo e simplesmente não desenhar gizmos/inspector.
- `ProjectManager` é o único módulo que sabe serializar/desserializar o
  mundo inteiro em JSON — todo sistema novo (guards, missions, graffiti...)
  só precisa adicionar seu pedaço no `serialize()`/`_applyProject()`.

---

## Roteiro de fases (do briefing)

- [x] **Fase 1** — Editor 3D + importação GLB + transformação de objetos.
- [ ] Fase 2 — Player + câmera isométrica + movimentação (WASD, mobile joystick).
- [ ] Fase 3 — Guard AI + patrulha (waypoints) + cone de detecção.
- [ ] Fase 4 — Security Cameras (fixas/rotativas, feed no HUD).
- [ ] Fase 5 — Graffiti Spots (before/after, spray animation).
- [ ] Fase 6 — Mission System (Mission Editor sem código).
- [ ] Fase 7 — Inventory.
- [ ] Fase 8 — Game UI (HUD configurável via `configs/ui.json`) + Vídeos MP4
      (`VideoManager`, `TriggerSystem`, `NarrativeSystem` do documento anexo).
- [ ] Fase 9 — Save/Load JSON completo (todas as fases).
- [ ] Fase 10 — Polimento e otimização.

---

## Testando agora

1. Suba um servidor local (`python3 -m http.server 8080`) e abra
   `configurador.html`.
2. Categoria **OBJETOS** → `+ IMPORTAR GLB` → escolha um `.glb` qualquer
   (não precisa ser dos seus modelos finais, qualquer GLB de teste serve).
3. Clique em `+ MAPA` — o objeto aparece no viewport e já fica selecionado.
4. Use `W`/`E`/`R` para mover/rotacionar/escalar; edite os números direto
   no Inspector; teste `Ctrl+D` para duplicar e `Delete` para excluir.
5. Feche a aba e abra de novo — o projeto (posições, assets, iluminação)
   volta sozinho via autosave.
6. `EXPORT JSON` para baixar o `project.json` e conferir o formato.

## Próxima etapa

Fase 2: `PlayerController.js` e `CameraController.js` em `js/game/`,
reaproveitando `SceneManager`/`AssetManager`/`CollisionSystem` já
prontos, mais o botão `▶ PLAY` (hoje desabilitado) ligando `game.html`
com o mundo salvo pelo configurador.
