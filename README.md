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

## Arquivo (banco de imagens 2020–2024)
O zip `2020.zip` (413 arquivos, 477 MB) foi processado: cópias repetidas removidas, imagens convertidas para `.webp` (miniatura + versão grande) e GIFs pesados convertidos para `.mp4`. Resultado: 341 imagens únicas, cerca de 33 MB.
Elas ficam em `media/arquivo/` e estão registradas em `content.json → archive` (ano, mês, tipo). Para recategorizar uma imagem, edite o campo `cat` (`flash`, `cartaz`, `quadro`, `mural`, `logo`, `animacao`) e rode `python3 build.py`.
- **Arquivo** (`arquivo.html`): filtros por ano e tipo, mosaico e visualizador. Link direto: `arquivo.html#2022-flash`.
- **Flash tattoo**: enquanto a pasta `flash-tattoo` não existir, mostra os desenhos de flash do arquivo (códigos `ARQ-ANO-NNN`).
- **Início, Portfólio e Sobre** usam imagens do arquivo como capas e linha do tempo quando faltam as originais.
- O PDF `portfoliodiegoogeid2023.pdf` (157 MB) **não** foi incluído: o GitHub recusa arquivos acima de 100 MB. Comprima-o antes de enviar.
