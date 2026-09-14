# OGEID GAME CONFIGURATOR — MVP

Este projeto é a primeira base funcional do editor 3D.

## Como abrir

Recomendado: hospedar em GitHub Pages ou iniciar um servidor local, porque módulos ES e importações GLB funcionam melhor via HTTP.

Exemplo:

```bash
python -m http.server 8080
```

Depois abra:

`http://localhost:8080`

## Modos

### BUILD
- viewport 3D
- seleção
- transform
- importação GLB
- criação de objetos
- inspector
- estados BEFORE/AFTER
- objetos de segurança, câmera, graffiti e trigger

### STORY
- missões
- biblioteca de vídeos
- preview narrativo

### PLAY
- personagem de teste
- WASD
- correr
- interação
- missão
- mudança de estado do muro
- HUD

## Próxima evolução

1. GLB com animações reais do personagem.
2. Guard AI com waypoint editor e cone de visão.
3. Câmeras com cone e feed real.
4. Editor visual de timeline.
5. Sistema completo de vídeos por trigger.
6. Graffiti painting animation.
7. Persistência de save/load do world state.
8. Mobile controls.
