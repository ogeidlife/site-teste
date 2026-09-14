# Ateliê — site em formato de jogo

## Estrutura

```
index.html          → home do site (jogo): personagem anda pelo mapa e entra na Galeria
product.html         → página de uma peça individual + formulário de pedido
configurator.html    → ferramenta local para cadastrar peças e conferir os .glb
css/style.css        → estilo de tudo
js/main.js           → mundo externo, personagem, construções
js/gallery.js        → interior da galeria, hover/comprar nas peças
js/product.js        → visualizador 3D da peça + envio do pedido
js/configurator.js   → lógica do configurador
data/artworks.json   → catálogo das peças (lido pelo site e escrito pelo configurador)
assets/models/       → coloque aqui os arquivos .glb reais das peças
```

Tudo é HTML/JS puro com Three.js carregado via CDN — não precisa de `npm install`
nem build. Basta abrir `index.html` num servidor local (ou hospedar como site estático).

Como não há passos de build, para testar localmente use um servidor simples, por
exemplo `npx serve .` ou a extensão "Live Server" do VS Code (abrir o `index.html`
direto do disco, com `file://`, pode bloquear o `fetch` do `artworks.json` em
alguns navegadores).

## Como funciona o jogo

- Setas ou WASD para andar; **E** para entrar na construção "Galeria" quando estiver perto.
- Dentro da galeria, passe o mouse sobre um quadro/escultura → aparece nome, preço e botão
  **Comprar**. Clicar leva para `product.html?id=<id-da-peça>`.
- **ESC** sai da galeria e volta para o mundo externo.
- As construções "Sobre" e "Contato" já estão no mapa como exemplo — hoje não fazem nada;
  quando você tiver essas páginas, basta marcá-las como `enterable: true` em `js/main.js`
  e repetir o mesmo padrão da galeria (trocar de cena ao entrar).

## Adicionando peças reais (.glb)

1. Abra `configurator.html` no navegador.
2. Preencha os campos da peça e escolha o arquivo `.glb` — ele aparece numa prévia 3D
   ali mesmo, só para conferir se carregou certo (nada é enviado, é só local).
3. Clique em **Salvar peça** para adicionar à lista à direita.
4. Quando terminar todas as peças, clique em **Baixar artworks.json** e substitua o
   arquivo em `data/artworks.json` pelo que foi baixado.
5. Copie os arquivos `.glb` reais para a pasta `assets/models/`, com o mesmo nome que
   você usou ao selecioná-los no configurador.
6. Reabra `index.html` — as peças novas aparecem na galeria nas posições configuradas.

Se uma peça ainda não tiver um `.glb` correspondente em `assets/models/`, o site
mostra automaticamente uma forma simples no lugar (quadro genérico ou escultura
genérica), então nada quebra enquanto os modelos finais não estão prontos.

## Configurando o envio de pedidos por email (EmailJS)

O formulário de `product.html` usa o [EmailJS](https://www.emailjs.com/), que envia
o email direto do navegador do cliente para o seu email, sem precisar de um servidor.

1. Crie uma conta gratuita em emailjs.com.
2. Em "Email Services", conecte o seu email (Gmail, Outlook etc.) — isso gera um
   **Service ID**.
3. Em "Email Templates", crie um template com variáveis como `{{customer_name}}`,
   `{{customer_email}}`, `{{customer_address}}`, `{{customer_message}}`,
   `{{artwork_title}}`, `{{artwork_price}}`, `{{artwork_id}}` — isso gera um
   **Template ID**.
4. Em "Account" → "API Keys", copie a **Public Key**.
5. Abra `js/product.js` e cole os três valores nas constantes no topo do arquivo:
   `EMAILJS_PUBLIC_KEY`, `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`.

Pronto — cada pedido finalizado chega no seu email com os dados do cliente e da peça.

## Publicando o site

Como é um site estático, qualquer um destes serve: Netlify, Vercel, GitHub Pages,
Cloudflare Pages. Basta arrastar a pasta inteira (ou conectar o repositório) —
não há variáveis de ambiente nem servidor para configurar, só as chaves do EmailJS
já coladas no código.

## Próximos passos sugeridos

- Trocar os placeholders visuais das construções "Sobre" e "Contato" por cenas reais.
- Adicionar som ambiente e efeito de passos.
- Se o catálogo crescer muito, mover `artworks.json` para um serviço como Firebase
  ou uma planilha do Google Sheets publicada como JSON, para não precisar reexportar
  e subir o arquivo manualmente a cada mudança.
