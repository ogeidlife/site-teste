# OGEID Game Configurator

Editor 3D + jogo de graffiti urbano/noturno em Three.js, sem backend,
hospedável no GitHub Pages. Este README documenta o que já está **funcional**
(Fase 1 + Fase 2) e o que está **preparado mas ainda não implementado**
(Fases 3–10 + narrativa/vídeos).

## Como testar

1. Sirva a pasta com um servidor local (obrigatório por causa dos ES modules
   e do `import type="importmap"` — não abre com `file://` direto):
   ```
   npx serve .
   # ou: python3 -m http.server 8080
   ```
2. Abra `index.html` → **ABRIR CONFIGURADOR**.
3. Na primeira vez, um mapa de demonstração é criado automaticamente
   (personagem, segurança, muros, prédio, câmera — tudo em primitivas
   coloridas, já que você ainda não importou seus GLBs).
4. Clique num objeto na viewport pra selecionar. `W`/`E`/`R` trocam entre
   mover/girar/escalar (ou use os botões no topo da viewport). O painel
   direito mostra Position/Rotation/Scale e permite editar também por número.
5. **+ GLB** no painel esquerdo importa seu modelo (fica salvo no IndexedDB
   do navegador — sobrevive a fechar a aba). Clique no card do asset pra
   colocá-lo no centro da viewport.
6. **SAVE** grava no localStorage. **EXPORT JSON** baixa o `project.json`
   completo (útil pra versionar no GitHub ou migrar de navegador — os GLBs
   embutidos ficam referenciados por id, não pelo binário, então ao dar
   **IMPORT JSON** em outro navegador você vai precisar reimportar os GLBs).
7. **▶ PLAY** salva e abre `game.html`: WASD move, Shift corre, câmera
   isométrica segue o personagem, colisão simples contra tudo marcado
   `[✓] COLLISION` no Inspector. `F3` liga um overlay de debug. `ESC` volta
   pro configurador. No celular aparece joystick virtual + botões.

## Adicionar seus GLBs

Não precisa editar nada — use o botão **+ GLB** dentro da categoria certa
(ex.: selecione "PERSONAGEM" no painel esquerdo antes de importar
`personagem.glb`, assim ele entra na Asset Library já marcado com essa
categoria). Animações do arquivo (Idle/Walk/Run/Spray etc.) são detectadas
automaticamente — hoje o `PlayerController` já lê `project.player.animations`
pra saber qual clip tocar em cada estado; ajuste esses nomes no JSON (ou, nas
próximas fases, por um campo no Inspector) pra bater com os nomes reais dos
seus clipes.

## Arquitetura (o que existe hoje)

```
index.html, configurador.html, game.html
css/configurador.css, css/game.css
js/core/
  EventBus.js        — pub/sub entre todos os sistemas
  BlobStore.js        — IndexedDB para binários (GLB; futuramente MP4)
  AssetManager.js      — importar/instanciar GLB, detectar animações
  SceneManager.js       — cena Three.js do editor, grid, luz noturna, seleção
  ProjectManager.js      — schema do project.json (já cobre todas as fases), save/load/export/import
js/configurator/
  main.js                 — bootstrap do editor, layout, toolbar, demo scene
  AssetLibrary.js           — biblioteca de assets + importação
  Inspector.js               — painel direito (transform, nome, categoria, colisão)
  TransformGizmo.js           — move/rotate/scale (TransformControls do three.js)
  SceneObjectFactory.js        — cria/serializa/reconstrói objetos do mapa
  [stubs p/ fases futuras: MissionEditor, GuardEditor, CameraEditor, UIEditor,
   VideoLibrary, VideoEditor, TriggerEditor, WorldStateEditor, NarrativeEditor,
   TimelineEditor, StoryPreview]
js/game/
  main.js            — Play Mode: carrega o projeto, monta o mundo, roda o loop
  PlayerController.js — movimento/aceleração/animação/colisão do jogador
  CameraController.js  — câmera isométrica/topdown/terceira pessoa
  InputManager.js        — teclado + joystick virtual mobile
js/systems/
  CollisionSystem.js — colisão por caixas (ativo)
  [stubs p/ fases futuras: GuardAI, SecurityCamera, MissionSystem, GraffitiSystem,
   InventorySystem, UIManager, Minimap, AudioManager, DebugSystem, VideoManager,
   TriggerSystem, EventSystem, WorldStateManager, NarrativeSystem, CinematicCamera,
   TimelineSystem]
assets/  (characters, environment, guards, props, cameras, graffiti, audio, videos)
configs/ (scene.json, missions.json, ui.json — templates de referência/exemplo)
```

Cada arquivo "stub" tem um comentário no topo explicando exatamente o que vai
fazer e quais campos do `project.json` já estão reservados pra ele — não é
pseudocódigo aleatório, é o encaixe real que as próximas fases vão preencher
sem precisar mudar o que já funciona.

## Próxima etapa

Você pediu pra continuar direto pra **Fase 2** (Player + Câmera) — ela já
está entregue aqui, junto com a Fase 1. A partir daqui, a ordem natural do
seu plano original é:

- **Fase 3** — Guard AI (waypoints, cone de visão, barra de detecção 0–100%,
  estados IDLE→PATROL→SUSPICIOUS→ALERT→CHASE→RETURN) + `GuardEditor.js`.
- **Fase 4** — Security Cameras (fixed/rotating, cone de visão, janela de
  monitoramento) + `CameraEditor.js`.
- **Fase 5** — Graffiti Spots (estado EMPTY→PAINTED sem duplicar o mapa,
  como pedido) + editor dedicado.
- Depois disso entra o sistema de **narrativa/vídeos/world state** que você
  descreveu por último — a arquitetura pra ele (VideoManager, TriggerSystem,
  EventSystem, WorldStateManager, NarrativeSystem, CinematicCamera,
  TimelineSystem, e os editores correspondentes) já está reservada em
  `js/systems/` e `js/configurator/`, e o `project.json` já tem `videos`,
  `triggers` e `worldState` prontos — só falta implementar a lógica.

Me diga se quer que eu já emende a Fase 3 (Guard AI) na sequência, ou se
prefere revisar/testar o que saiu até aqui primeiro.
