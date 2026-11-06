'use strict';
// OGEID — servidor web (Node >= 22.5, sem dependências externas). Uso: node server.js
const http = require('http'), fs = require('fs'), path = require('path');
const D = require('./src/db'), L = require('./src/lib');
const pub = require('./src/public'), adm = require('./src/admin');

D.seed();
// Primeiro administrador via variáveis de ambiente (só cria se não existir nenhum usuário)
if (!D.q.get('SELECT COUNT(*) c FROM users').c) {
  const e = (process.env.ADMIN_EMAIL || '').trim().toLowerCase(), p = process.env.ADMIN_PASSWORD || '';
  if (e && p.length >= 10) { D.q.run('INSERT INTO users(email,pass_hash) VALUES(?,?)', e, L.hashPw(p)); console.log('Administrador criado:', e); }
  else console.warn('\n⚠  Nenhum administrador. Defina ADMIN_EMAIL e ADMIN_PASSWORD (mín. 10 caracteres) e reinicie, ou rode: node tools/create-admin.js\n');
}

const MIME = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml' };
const SEC = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-src https://www.youtube-nocookie.com https://player.vimeo.com; media-src 'self' https:; form-action 'self'; frame-ancestors 'none'; base-uri 'self'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
const routes = [...pub.routes, ...adm.routes];

function serveStatic(req, res, base, rel, maxAge) {
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base + path.sep)) return false;
  let st; try { st = fs.statSync(file); } catch { return false; } if (!st.isFile()) return false;
  const etag = `"${st.size}-${Math.floor(st.mtimeMs)}"`;
  const h = { ...SEC, 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': `public, max-age=${maxAge}`, ETag: etag };
  if (file.includes(`${path.sep}uploads${path.sep}`)) h['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, h); res.end(); return true; }
  res.writeHead(200, { ...h, 'Content-Length': st.size }); fs.createReadStream(file).pipe(res); return true;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x'); let p = decodeURIComponent(url.pathname);
    if (p.length > 1 && p.endsWith('/')) { res.writeHead(301, { Location: p.slice(0, -1) + url.search }); return res.end(); }
    if (req.method === 'GET' || req.method === 'HEAD') {
      if (/^\/(css|js|media)\//.test(p) && serveStatic(req, res, path.join(__dirname, 'public'), p.slice(1), p.startsWith('/media') ? 604800 : 3600)) return;
      if (p.startsWith('/uploads/') && serveStatic(req, res, path.join(D.DATA, 'uploads'), p.slice(9), 604800)) return;
    }
    const settings = D.allSettings(), session = L.getSession(req);
    const isAdmin = p === '/painel' || p.startsWith('/painel/');
    if (isAdmin && !session && p !== '/painel/login') { res.writeHead(302, { Location: '/painel/login', ...SEC }); return res.end(); }
    let fields = {}, files = [];
    if (req.method === 'POST') {
      ({ fields, files } = await L.parseRequest(req));
      if (isAdmin && p !== '/painel/login' && fields._csrf !== session.csrf) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', ...SEC }); return res.end('Requisição inválida (CSRF). Recarregue a página.'); }
    }
    const method = req.method === 'HEAD' ? 'GET' : req.method;
    let out = null; const ctx = { req, res, url, query: Object.fromEntries(url.searchParams), fields, files, session, settings };
    for (const r of routes) { if (r.method !== method) continue; const m = r.re.exec(p); if (m) { out = await r.fn(ctx, m.slice(1)); break; } }
    if (!out) out = pub.notFound(ctx);
    const headers = { ...SEC, 'Content-Type': out.type || 'text/html; charset=utf-8', ...(out.headers || {}) };
    if (isAdmin || out.cookie) headers['Cache-Control'] = 'no-store';
    if (out.cookie) headers['Set-Cookie'] = out.cookie;
    if (out.redirect) { res.writeHead(303, { ...headers, Location: out.redirect }); return res.end(); }
    res.writeHead(out.status || 200, headers); res.end(req.method === 'HEAD' ? undefined : String(out.body ?? ''));
  } catch (e) {
    const code = e.code === 413 ? 413 : 500; if (code === 500) console.error(e);
    if (!res.headersSent) res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', ...SEC });
    res.end(code === 413 ? 'Arquivo muito grande (limite 30 MB).' : 'Erro interno. Tente novamente em instantes.');
  }
});
const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, process.env.HOST || '0.0.0.0', () => console.log(`OGEID rodando em http://localhost:${PORT}  ·  painel: /painel`));
