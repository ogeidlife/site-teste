# OGEID — site estático

Site da OGEID pronto para o **GitHub Pages** (HTML, CSS e JS puros, sem servidor).

## Publicar no GitHub
1. Crie um repositório e envie **todo o conteúdo desta pasta** (incluindo `.nojekyll`).
2. No repositório: **Settings → Pages → Build and deployment → Deploy from a branch** → branch `main`, pasta `/ (root)`.
3. Em alguns minutos o site abre em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

## Atualizar o conteúdo
Todo o conteúdo está em `content.json` (textos, flashes, catálogo, projetos, currículo, contatos).

    python3 build.py

Isso regenera todas as páginas `.html`. Depois é só enviar para o GitHub de novo.

- **WhatsApp e e-mail:** preencha `settings.whatsapp` (só números, com DDI, ex.: `5511999999999`) e `settings.email`. Enquanto estiverem vazios, o formulário leva a pessoa ao Instagram (`ig.me/m/ogeid_life`) com a mensagem copiada.
- **Domínio próprio:** defina `SITE_URL=https://seudominio.com` ao rodar o build para gerar `sitemap.xml` e `robots.txt`.

## Imagens
Ficam em `media/<pasta>/web/` (grande) e `media/<pasta>/thumb/` (miniatura), em `.webp`.
O zip original trouxe só `graphic-design` e `projects`. Faltam as pastas **flash-tattoo, paintings, drawings, sculptures e clothing** — por enquanto aparecem como espaços reservados com o código. Copie essas pastas para `media/` (mesmo padrão de nomes) e rode `python3 build.py`.

## O que mudou em relação ao zip original
O zip era de um sistema com servidor Node + painel (`/painel`), mas `server.js`, `lib/` e `painel/` não vieram no arquivo, e o GitHub Pages não executa servidor. Por isso:
- o site agora é gerado estaticamente a partir do `content.json`;
- o painel de edição e as estatísticas de visitas foram removidos (edite o JSON);
- o formulário monta a mensagem e abre WhatsApp, e-mail ou Instagram em vez de gravar pedidos no servidor.

## Arquivo 2020–2024
Seção nova (menu **Arquivo**) com 348 obras de 2020, 2021, 2022 e 2024, organizada por ano e por mês.

- Páginas: `arquivo.html` (visão geral + linha do tempo + animações) e `arquivo-2020.html`, `arquivo-2021.html`, `arquivo-2022.html`, `arquivo-2024.html` (galeria mês a mês, filtro por tipo, lightbox com setas/teclado/deslizar).
- Imagens: `media/archive-AAAA/web/` (grande) e `media/archive-AAAA/thumb/` (miniatura), em `.webp`. GIFs animados viram `.webp` animado.
- Dados: `archive.json` — edite **títulos** (`title`) de cada obra, o **texto e a capa de cada ano** (`years`) e a introdução (`intro`). Depois rode `python3 build.py`.
- Para importar novas pastas (ex.: 2023 ou 2025): `python3 tools/ingest_archive.py CAMINHO` (a pasta que contém `2023/`, `2025/`...). Seus títulos já editados são preservados.
- `tools/archive_manifest.json` lista o que ficou de fora: duplicatas idênticas, cópias `cropped-*` do WordPress e o PDF do portfólio (161 MB — acima do limite de 100 MB por arquivo do GitHub).
