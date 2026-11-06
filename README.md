# OGEID — Artist Portfolio & Creative Catalog

Site público + painel administrativo para o artista OGEID: **Flash Tattoo**, **Agendamento**, **Catálogo/Encomendas**, **Portfólio**, **Sobre**, **Currículo** e **Contato**.

## 1. Arquitetura (e por quê)

| Camada | Escolha | Motivo |
|---|---|---|
| Servidor | **Node.js ≥ 22.13**, sem dependências externas | `npm install` não é necessário; menos coisas para quebrar/atualizar |
| Banco | **SQLite** (`node:sqlite`, arquivo `data/ogeid.db`) | Persistente, estruturado, backup = copiar um arquivo; suporta milhares de registros |
| Páginas | Renderização no servidor (HTML) | Rápido, bom para SEO, funciona sem JavaScript |
| Autenticação | Senha com `scrypt`, sessão em cookie `HttpOnly`, token CSRF em todo POST do painel | Sem serviços externos |
| Mídia | Versões otimizadas em `public/media/…` (WebP) + uploads do painel em `data/uploads/` | Originais nunca são alterados |
| Opcional | `npm i sharp` | Se instalado, uploads do painel ganham redimensionamento e miniaturas automáticos |

Estrutura:

```
server.js            servidor, rotas, segurança (CSP, CSRF), arquivos estáticos
src/db.js            esquema do banco, seed inicial, status e categorias
src/lib.js           templates, upload, senhas, anti-spam, notificações
src/public.js        todas as páginas públicas e formulários
src/admin.js         painel administrativo (/painel)
src/payments.js      estrutura do Mercado Pago (desativada)
public/              css, js e media otimizada (web + thumb)
media/               estrutura de originais por categoria (vazia no pacote; veja §6)
data/                banco, uploads, seed.json, media-manifest.csv
tools/               build_media.py, import-originals.py, create-admin.js, smoke-test.js
```

## 2. Instalação (computador local)

1. Instale o **Node 22.13 ou mais novo** (https://nodejs.org).
2. Na pasta do projeto, crie o administrador e inicie:

```bash
# Linux/macOS
ADMIN_EMAIL=voce@email.com ADMIN_PASSWORD='uma-senha-com-10+-caracteres' node server.js
# Windows (PowerShell)
$env:ADMIN_EMAIL="voce@email.com"; $env:ADMIN_PASSWORD="uma-senha-com-10+-caracteres"; node server.js
```

3. Abra **http://localhost:3000** (site) e **http://localhost:3000/painel** (painel).

Na **primeira execução** o banco é criado e populado com o seu acervo (273 flashes, 13 projetos de portfólio, 16 produtos (14 publicados e 2 rascunhos), currículo). Depois, `ADMIN_PASSWORD` pode ser removida. Para criar/redefinir um usuário: `node tools/create-admin.js email "senha"`.

## 3. Banco de dados, autenticação, arquivos e e-mail

* **Banco:** automático. Local: `data/ogeid.db` (ou `DATA_DIR`). **Backup:** copie a pasta `data/` inteira (banco + uploads). 
* **Autenticação:** usuários na tabela `users`. Sessão de 12 h. Tentativas de login limitadas (8 / 10 min).
* **Arquivos:** imagens enviadas no painel vão para `data/uploads/` (JPG, PNG, WEBP, GIF; o tipo é verificado pelo conteúdo, não pela extensão; limite de 30 MB por envio). Para melhor desempenho, exporte imagens com até ~2000 px ou instale `sharp`.
* **Vídeos:** no portfólio, cole links (YouTube, Vimeo ou `.mp4`) — um por linha.
* **Contatos:** e-mail oficial e WhatsApp em **Painel → Configurações** (nada foi inventado; campos vazios não aparecem no site).
* **Avisos de novas solicitações:** toda solicitação é registrada em `data/outbox.log`. Para receber no e-mail/WhatsApp:
  * mais simples: defina `NOTIFY_WEBHOOK_URL` (Zapier, Make ou n8n recebem um POST JSON e enviam e-mail/WhatsApp);
  * ou implemente `sendEmail()` em `src/lib.js` (único ponto de integração para SMTP, Resend, Mailgun etc.) e defina `NOTIFY_EMAIL_TO`.
* **Mercado Pago:** estrutura pronta em `src/payments.js`, com o passo a passo. **Onde colocar a credencial:** variável `MP_ACCESS_TOKEN`. Enquanto vazia, nenhum pagamento é simulado.

## 4. Publicação (hospedagem)

O site precisa de **um servidor Node com disco persistente** (por causa do banco e dos uploads). Não funciona em hospedagens só-estáticas (GitHub Pages, Netlify, Vercel serverless).

**Opção A — VPS (recomendada; ~US$ 5/mês, ex.: Hetzner, DigitalOcean, Contabo):**

1. Instale Node 22 e envie a pasta do projeto (`scp`/git).
2. Crie `/etc/ogeid.env` com as variáveis de `.env.example` (use `NODE_ENV=production`, `TRUST_PROXY=1`, `SITE_URL=https://seudominio`).
3. Rode como serviço (systemd):
```ini
[Service]
WorkingDirectory=/srv/ogeid
EnvironmentFile=/etc/ogeid.env
ExecStart=/usr/bin/node server.js
Restart=always
User=ogeid
```
4. HTTPS com **Caddy** (certificado automático) — `Caddyfile`:
```
seudominio.com.br { reverse_proxy localhost:3000 }
```
5. Aponte o DNS do domínio para o IP do servidor.

**Opção B — plataforma com disco persistente (Railway, Render, Fly.io):** use o `Dockerfile` incluído, monte um volume em `/data` e defina as variáveis de ambiente. 

**Backup:** agende uma cópia diária de `DATA_DIR` (ex.: `rsync` ou snapshot do servidor).

## 5. Como atualizar o conteúdo (Painel → /painel)

* **Flash tattoo:** *+ Novo flash* (envie a imagem; o código `OG-F-####` é gerado). Edite nome, categoria, estilo, tamanho, dimensões, local do corpo, descrição, **valor** e **status** (Disponível, Reservado, Tatuado/Indisponível, Exclusivo). Na lista, selecione vários e use **ação em lote** (mudar status, categoria, publicar/ocultar, excluir). Os filtros do site só aparecem quando há dados cadastrados (ex.: o filtro de preço surge assim que um flash tem valor).
* **Agendamentos:** chegam como *solicitações* (status Novo → Em análise → Aguardando resposta → Confirmado → Concluído / Cancelado). Abra, veja as referências enviadas, mude o status e escreva observações privadas. Ao marcar o desenho como *Reservado* ou *Tatuado* na página do flash, o site passa a refletir (desenho tatuado não aceita novos pedidos).
* **Catálogo:** cadastre produtos com várias fotos (ordem e remoção), preço, dimensões, materiais, status e estoque. Sem preço → o site mostra “Sob consulta”. **Encomendas:** Nova → Em negociação → Aguardando pagamento → Em produção → Concluída / Cancelada.
* **Portfólio:** crie projetos/séries (texto curatorial, contexto conceitual, técnica, dimensões, imagens, vídeos), defina a **ordem** e marque **Destacar na página inicial**. Categorias editáveis em *Categorias*.
* **Currículo:** adicione exposições, residências, editais, publicações, cursos etc. em *Currículo*. Para o PDF: envie um arquivo em *Configurações* (ou o site oferece “imprimir/salvar como PDF” automaticamente).
* **Textos do site** (Sobre, avisos dos formulários, política de privacidade) em *Configurações*.

## 6. O que foi feito com o seu acervo (`23-25-26.zip`)

* 434 arquivos analisados → **414 únicos**. **19 duplicatas exatas** (mesmo conteúdo) e **6 variantes** (versões menores/retocadas do mesmo arquivo) **não foram publicadas**; **7 arquivos foram omitidos por trazerem o nome civil escrito na imagem** (veja §9). Nada foi apagado ou alterado.
* Classificação: 273 flash (traço preto), 63 pinturas/obras em papel, 5 desenhos a nanquim, 5 esculturas/objetos, 10 peças de vestuário, 13 imagens de projetos (OGEID WINE, rolling paper, publicação), 14 peças gráficas e 19 logotipos.
* Versões de site: `public/media/<categoria>/web` (até 1600 px) e `/thumb` (520 px), em WebP, **sem cortes** — a proporção original é preservada (as grades usam `contain`).
* **Mapa completo:** `data/media-manifest.csv` (arquivo original → status → código → categoria → versões).
* Para ter os **originais organizados** na estrutura `/media/{flash-tattoo,paintings,drawings,sculptures,animations,graphic-design,clothing,projects,profile,documents}`:
  `python3 tools/import-originals.py <pasta-do-zip-descompactado>` (copia, sem alterar; duplicatas vão para `media/_duplicatas`). Eles não vão no pacote por pesarem ~500 MB. Para regerar as versões web: `python3 tools/build_media.py <pasta>` (requer Pillow).

### ⚠ O que você precisa revisar no painel (nada disso foi inventado)

1. **Flash:** nenhum título, preço, dimensão ou local do corpo existia no acervo — ficaram **vazios** (o site mostra o código e “A combinar”). A categoria vem da pasta (“Drop 13”… só onde a pasta traz o logotipo do drop; senão “Flash 2025/2026”). O **status inicial é “Disponível” para todos**: marque os que já foram tatuados, reservados ou exclusivos.
2. **Ano dos projetos** = ano da pasta do arquivo (data de publicação), não necessariamente da criação. **Técnicas e dimensões** ficaram em branco; os textos de portfólio são descrições neutras para você reescrever.
3. **Catálogo:** produtos criados a partir de fotos de vestuário, prints OGEID WINE, quadros e a caixa de vinho, todos **“Sob consulta”**, sem preço nem estoque. “Portfólio artístico impresso” e “OGEID Rolling Paper” estão como **rascunho** (ocultos) até você confirmar se estão à venda.
4. **Nome civil:** removido de tudo (veja §9). Se quiser publicá-lo no futuro, é uma decisão sua, feita por você no painel.
5. Imagens de 2023/05 trazem a marca d’água *www.ogeidstyle.com.br* (mantida, pois é o arquivo original).
6. Não havia vídeos nem animações no acervo: a categoria *Animação* existe, vazia, pronta para links de vídeo.
7. **Textos curatoriais:** todos os projetos já vêm com texto curatorial e contexto conceitual (veja §10) — leia e ajuste.
8. **Produto com bebida alcoólica:** a “Caixa OGEID WINE” aparece nas fotos com selo +18. Antes de vender online, confirme as regras de venda de bebida alcoólica (verificação de idade, licenças) ou oculte o produto no painel.
9. Informe e-mail oficial, WhatsApp e (opcional) PDF do currículo em *Configurações*.

## 7. Segurança e privacidade

* Formulários com **proteção anti-spam**: campo-armadilha (honeypot), tempo mínimo de preenchimento, limite de envios por IP e validação no servidor.
* **Consentimento** obrigatório (LGPD) em todo formulário; texto editável em *Configurações*. IP **não é guardado**: só um código irreversível para limitar abuso. Dados ficam no banco do servidor, nunca só no navegador.
* Painel protegido por login, CSRF, cookies `HttpOnly` + `SameSite`, cabeçalhos de segurança (CSP restritiva) e tipo real do arquivo verificado nos uploads. Uploads são servidos em modo *sandbox*.
* Em produção use sempre **HTTPS** e `NODE_ENV=production`; troque a senha em *Minha conta*.

## 8. Testes

`TRUST_PROXY=1 node server.js` (em um banco de teste, ex.: `DATA_DIR=/tmp/t`) e, em outro terminal:
`ADMIN_EMAIL=… ADMIN_PASSWORD=… BASE=http://localhost:3000 node tools/smoke-test.js` — roda 66 verificações: navegação, filtros, formulários (válidos, inválidos, spam, upload falso), acesso ao painel, CSRF, edição de flash, produtos com várias fotos, portfólio, categorias, currículo e configurações. **Não rode no banco real** (cria registros de teste).

## 9. Nome civil: o que foi feito

* Nenhum texto, código, banco ou documentação do projeto contém o nome civil; o site usa **somente OGEID** (título, Sobre, currículo, SEO, rodapé).
* O nome civil aparecia **dentro de 7 imagens** (capas do portfólio impresso, um logotipo de texto e uma folha de adesivos). Elas foram **omitidas do site** (status `omitida-nome-civil` em `data/media-manifest.csv`); os originais continuam intactos no seu acervo. Isso vale também para cópias idênticas.
* Conferência: revisão visual de todas as imagens e busca nos textos. A leitura automática de texto (OCR) não reconhece letras estilizadas, então **dê uma olhada final** em assinaturas pequenas ao publicar novas obras. Para omitir outro arquivo, acrescente o caminho em `EXCLUDE_NOME_CIVIL` de `tools/build_media.py` e rode o script de novo (ou apenas oculte o item no painel).

## 10. Textos curatoriais

* Fonte: `src/curatorial.js` (13 projetos: texto curatorial + contexto conceitual). Descrevem o que é visível nas imagens e o posicionamento do artista; **não afirmam técnica, dimensões, datas exatas, exposições, prêmios ou clientes**. São um ponto de partida: revise as interpretações.
* **Editar:** Painel → Portfólio → abrir o projeto → campos *Texto curatorial / descrição* e *Contextualização conceitual* → Salvar. Parágrafos separados por linha em branco. Mudança vale imediatamente no site.
* Banco novo já nasce com os textos. Para aplicar a um banco **já existente**: `node tools/apply-curatorial.js` (só preenche campos vazios) ou `node tools/apply-curatorial.js --force` (sobrescreve; faça backup de `data/`).

## 11. GitHub

### Onde está o `index.html`?
O site completo (com painel, banco e formulários) **gera as páginas pelo servidor** (`node server.js`), por isso a raiz do projeto não tem `index.html`. Para o **GitHub Pages** existe a **versão estática** em **`docs/index.html`** — uma vitrine somente-leitura: home, flash tattoo com filtros, catálogo, portfólio com textos curatoriais, sobre, currículo e contato. Nela **não há painel, banco nem formulários**: agendamento, encomenda e contato viram uma mensagem pronta para enviar por Instagram (copia a mensagem e abre o perfil), WhatsApp e e-mail (os dois últimos só aparecem se você informar os dados ao gerar).

* **Publicar no GitHub Pages:** repositório → *Settings → Pages → Build and deployment → Deploy from a branch → Branch: `main`, pasta `/docs`* → Save. O endereço aparece na mesma tela (`https://SEU-USUARIO.github.io/NOME-DO-REPO/`). Pages gratuito exige repositório **público** (ou plano pago para privado) — e repositório público expõe as imagens do acervo.
* **Gerar de novo** (depois de mudar textos, flashes etc.): `node tools/export-static.js --base-url=https://SEU-USUARIO.github.io/NOME-DO-REPO --whatsapp=5511999999999 --email=voce@email.com` (omita o que não quiser exibir). Para exportar o conteúdo do **seu banco real**, rode com `DATA_DIR=<pasta do seu banco>` na frente. Depois: `git add docs && git commit -m "atualiza site" && git push`.
* A versão estática é uma **fotografia** do conteúdo no momento da exportação; quem edita pelo painel precisa exportar de novo para publicar a mudança.

### Usos do repositório

**Importante:** o GitHub Pages só serve páginas estáticas; o site completo (formulários, painel e banco) precisa de servidor. Por isso há a vitrine estática acima e mais estes usos:

1. **Guardar e versionar o código** (repositório já inicializado, com 1 commit):
```bash
# crie um repositório VAZIO e PRIVADO em github.com/new (ex.: ogeid-site), depois:
git remote add origin https://github.com/SEU-USUARIO/ogeid-site.git
git push -u origin main
```
   Mantenha o repositório **privado**: ele contém as imagens do seu acervo. O banco de dados (`data/ogeid.db`), os uploads e as senhas **não** vão para o GitHub (estão no `.gitignore`).
2. **Rodar no próprio GitHub — Codespaces** (mais rápido para ver funcionando):
   * No repositório: *Settings → Secrets and variables → Codespaces* → crie `ADMIN_EMAIL` e `ADMIN_PASSWORD` (mín. 10 caracteres).
   * *Code → Codespaces → Create codespace on main*. O servidor inicia sozinho (`.devcontainer/`) e a aba **Ports** mostra o endereço da porta 3000 (site e `/painel`).
   * Os dados ficam no codespace enquanto ele existir (ele pausa por inatividade e pode ser apagado após um período sem uso): serve para desenvolver/demonstrar, **não** como site no ar. Faça backup da pasta `data/`.
3. **Colocar no ar a partir do GitHub (produção):** conecte o repositório a uma hospedagem com disco persistente. O arquivo `render.yaml` já está pronto para o **Render** (*New → Blueprint*; informe `SITE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`); a cada `git push` o site atualiza. Serve também o `Dockerfile` (Railway, Fly.io). Veja §4 para VPS.

O workflow `.github/workflows/ci.yml` roda os 66 testes a cada push (aba *Actions*), sem tocar no seu banco real.
