# OGEID — site + painel de controle

Site novo e painel separado (`/painel`) para editar tudo sem mexer em código: textos, flashes, catálogo, portfólio, fotos, contatos, pedidos e estatísticas de visitas.

## Rodar no seu computador
Precisa do [Node.js](https://nodejs.org) 20 ou mais novo. Não há nada para instalar.

    node server.js

- Site: http://localhost:3000
- Painel: http://localhost:3000/painel
- No primeiro uso, a **senha do painel aparece no terminal** (ou defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` antes de iniciar). Troque em *Configurações*.

## Publicar na internet
O painel grava dados, então precisa de uma hospedagem que rode Node **com disco persistente** (Railway, Render com disco, Fly.io, VPS…). O GitHub Pages não serve, porque só hospeda arquivos estáticos.

Variáveis de ambiente:

| Variável | Para quê |
|---|---|
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | acesso inicial ao painel (usadas só na primeira vez) |
| `DATA_DIR` | pasta do disco persistente, onde ficam textos editados, fotos enviadas, pedidos e visitas |
| `TRUST_PROXY=1` | ligue sempre que o site estiver atrás de HTTPS/proxy da hospedagem |
| `SITE_URL` | endereço final (ex.: `https://ogeid.art`), usado no sitemap |
| `PORT` | porta (a hospedagem costuma definir sozinha) |

Há também um `Dockerfile` (monte o disco em `/data`). Comando de início: `node server.js`.

## O que o painel faz
- **Resumo:** visitas, visitantes, pedidos, cliques em WhatsApp/Instagram, flashes/obras/projetos mais vistos, origem das visitas e aparelhos (7, 30 ou 90 dias). Sem cookies e sem guardar IP; suas visitas logado não contam.
- **Pedidos:** tudo que os clientes enviam pelos formulários, com status, anotações e planilha CSV.
- **Flash tattoo:** editar, mudar situação/valor/coleção em lote, adicionar fotos novas, excluir.
- **Catálogo / Portfólio:** criar, editar, reordenar, trocar fotos, destacar na página inicial.
- **Textos e páginas:** início, “como funciona”, sobre, currículo, introduções, menu, rodapé, privacidade.
- **Configurações:** WhatsApp, e-mail, Instagram, senha, backup.

## Segurança e cópias
O sistema guarda sozinho as últimas 40 versões do conteúdo em `DATA_DIR/backups`. Em *Configurações* você baixa um backup completo. Faça isso de vez em quando.

## Teste automático
    node tools/smoke-test.js

## Pastas
    server.js      servidor, login e API
    lib/           páginas do site, estatísticas, armazenamento
    public/        CSS e JS do site
    painel/        painel de controle (separado do site)
    media/         imagens originais
    seed/          conteúdo inicial (copiado para DATA_DIR na primeira execução)
