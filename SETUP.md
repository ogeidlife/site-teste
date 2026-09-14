# Cofre — como colocar no ar

Site simples: uma senha, um link, arquivos que sua equipe pode enviar/baixar a qualquer momento. Usa o Firebase (gratuito no plano Spark para esse volume de uso).

## 1. Criar o projeto Firebase
1. Acesse https://console.firebase.google.com e crie um projeto novo (ex: "cofre-equipe").
2. No menu lateral, vá em **Build > Authentication** → aba "Sign-in method" → ative **E-mail/senha**.
3. Ainda em Authentication, aba **Users** → "Add user" → cadastre:
   - E-mail: `equipe@cofre.local` (o mesmo que está em `firebase-config.js`)
   - Senha: a senha que sua equipe vai digitar para entrar no site
4. No menu lateral, vá em **Build > Storage** → "Get started" → crie o bucket (modo produção).
5. Em Storage, aba **Rules**, cole o conteúdo do arquivo `storage.rules` e publique.

## 2. Conectar o site ao seu projeto
1. No console, vá em **Configurações do projeto** (ícone de engrenagem) → role até "Seus apps" → clique no ícone `</>` para criar um app Web.
2. Copie o objeto `firebaseConfig` que aparece e cole dentro de `firebase-config.js`, substituindo os campos "COLE_AQUI".

## 3. Publicar o site
Opção mais simples — **Firebase Hosting**, direto pelo terminal:
```
npm install -g firebase-tools
firebase login
firebase init hosting   # escolha o projeto criado, pasta pública = esta pasta
firebase deploy
```
Isso gera um link do tipo `https://cofre-equipe.web.app` — é esse link que você compartilha com a equipe.

Alternativa: qualquer hospedagem estática funciona (GitHub Pages, Netlify, Vercel) — é só subir os 3 arquivos (`index.html`, `firebase-config.js`, e o link continua o mesmo para todo mundo).

## Como funciona no dia a dia
- Quem acessa o link vê só um campo de senha.
- Depois de entrar, qualquer pessoa da equipe pode arrastar arquivos para a zona de upload, baixar ou excluir arquivos existentes.
- Não existe limite prático de quantidade de arquivos — o plano gratuito do Firebase Storage cobre 5GB, dá pra acompanhar o uso em Storage > Usage no console.
- Para trocar a senha da equipe: Authentication > Users > editar o usuário `equipe@cofre.local`.
- Para dar acesso de administrador separado (por exemplo, só você pode excluir), me avise — dá pra adicionar isso nas regras do Storage.
