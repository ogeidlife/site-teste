'use strict';
// Site + painel de controle OGEID. Sem dependências: rode com  node server.js
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');
const ROOT = __dirname, DATA = process.env.DATA_DIR || path.join(ROOT, 'data'), PORT = +process.env.PORT || 3000;
const TRUST = !!process.env.TRUST_PROXY;
const store = require('./lib/store')(DATA, ROOT);
const stats = require('./lib/stats')(DATA, store.secret);

// ---------- biblioteca de imagens (media do site + enviadas pelo painel)
let files = new Set();
function scan() {
  const s = new Set(), walk = (base, pre) => { try { fs.readdirSync(base).forEach(f => { const d = path.join(base, f); if (!fs.statSync(d).isDirectory()) return; ['thumb', 'web'].forEach(sz => { try { fs.readdirSync(path.join(d, sz)).forEach(n => s.add(`${pre}${f}/${n.replace(/\.[^.]+$/, '')}|${sz}`)); } catch (e) { } }); }); } catch (e) { } };
  walk(path.join(ROOT, 'media'), '');
  ['thumb', 'web'].forEach(sz => { try { fs.readdirSync(path.join(DATA, 'uploads', sz)).forEach(n => s.add(`u/${n}|${sz}`)); } catch (e) { } });
  files = s;
}
scan();
const media = {
  url(r, sz) {
    if (sz === 'web' && !files.has(`${r}|web`)) sz = 'thumb';
    if (r.startsWith('u/')) return `/media/u/${sz}/${r.slice(2)}`;
    const [f, i] = r.split('/'); return `/media/${f}/${sz}/${i}.webp`;
  },
};
media.has = r => { r = String(r); return files.has(`${r}|thumb`) || files.has(`${r}|web`); };
const views = require('./lib/views')(() => store.content, media);

// ---------- utilidades
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon' };
const ipOf = req => (TRUST && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '';
const isHttps = req => req.socket.encrypted || (TRUST && req.headers['x-forwarded-proto'] === 'https');
const cookies = req => Object.fromEntries(String(req.headers.cookie || '').split(';').map(c => c.trim().split(/=(.*)/s).slice(0, 2)).filter(c => c[0]));
const slug = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'" };

function send(req, res, code, body, type, extra) {
  const h = Object.assign({ 'Content-Type': type || MIME['.html'] }, SEC, extra);
  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    if (/(text|json|javascript|xml)/.test(h['Content-Type']) && /\bgzip\b/.test(req.headers['accept-encoding'] || '') && body.length > 1024) { body = zlib.gzipSync(body); h['Content-Encoding'] = 'gzip'; h.Vary = 'Accept-Encoding'; }
    h['Content-Length'] = Buffer.byteLength(body);
  }
  res.writeHead(code, h); res.end(body);
}
const json = (req, res, code, obj, extra) => send(req, res, code, JSON.stringify(obj), MIME['.json'], Object.assign({ 'Cache-Control': 'no-store' }, extra));
const redirect = (res, to, code) => { res.writeHead(code || 301, { Location: to }); res.end(); };

function body(req, limit) {
  return new Promise((ok, no) => {
    let n = 0; const ch = [];
    req.on('data', d => { n += d.length; if (n > limit) { no(new Error('grande demais')); req.destroy(); } else ch.push(d); });
    req.on('end', () => {
      const t = Buffer.concat(ch).toString('utf8'), ct = req.headers['content-type'] || '';
      try { ok(ct.includes('json') ? JSON.parse(t || '{}') : Object.fromEntries(new URLSearchParams(t))); } catch (e) { no(new Error('corpo inválido')); }
    });
    req.on('error', no);
  });
}

const hits = new Map();
function limited(k, max, ms) { const now = Date.now(), a = (hits.get(k) || []).filter(t => now - t < ms); if (a.length >= max) { hits.set(k, a); return true; } a.push(now); hits.set(k, a); return false; }
setInterval(() => hits.clear(), 3600e3).unref();

// ---------- sessão do painel
const sign = v => crypto.createHmac('sha256', store.secret).update(v).digest('base64url');
function makeToken() { const p = Buffer.from(JSON.stringify({ e: Date.now() + 14 * 864e5 })).toString('base64url'); return p + '.' + sign(p); }
function authed(req) {
  const t = cookies(req).og_s; if (!t) return false; const [p, s] = t.split('.'); if (!p || !s || sign(p) !== s) return false;
  try { return JSON.parse(Buffer.from(p, 'base64url').toString()).e > Date.now(); } catch (e) { return false; }
}
const cookie = (req, n, v, age, http) => `${n}=${v}; Path=/; Max-Age=${age}; SameSite=Strict${http ? '; HttpOnly' : ''}${isHttps(req) ? '; Secure' : ''}`;

// ---------- arquivos estáticos
function serveFile(req, res, base, rel, cache) {
  const f = path.resolve(base, '.' + path.sep + decodeURIComponent(rel));
  if (!f.startsWith(path.resolve(base) + path.sep)) return false;
  let st; try { st = fs.statSync(f); } catch (e) { return false; }
  if (!st.isFile()) return false;
  const type = MIME[path.extname(f).toLowerCase()]; if (!type) return false;
  const etag = `"${st.size}-${Math.round(st.mtimeMs)}"`;
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, SEC); res.end(); return true; }
  send(req, res, 200, fs.readFileSync(f), type, { 'Cache-Control': cache, ETag: etag }); return true;
}

// ---------- API pública
async function publicApi(req, res, u) {
  const ip = ipOf(req);
  if (u.pathname === '/api/t' && req.method === 'POST') {
    if (cookies(req).og_me || limited('t' + ip, 240, 60e3)) return json(req, res, 200, { ok: 1 });
    let b = {}; try { b = await body(req, 2000); } catch (e) { }
    stats.record(b.e ? 'e' : 'v', req, b, ip); return json(req, res, 200, { ok: 1 });
  }
  if (u.pathname === '/api/pedido' && req.method === 'POST') {
    const wantsJson = (req.headers['content-type'] || '').includes('json');
    let b; try { b = await body(req, 20000); } catch (e) { return json(req, res, 400, { error: 'inválido' }); }
    const fin = o => wantsJson ? json(req, res, 200, o) : redirect(res, '/contato?enviado=1', 303);
    if (b.site) return fin({ ok: 1 });                       // isca anti-robô
    if (limited('p' + ip, 6, 600e3)) return json(req, res, 429, { error: 'muitas tentativas' });
    const cl = (v, n) => String(v || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
    const type = ['tattoo', 'produto', 'outro'].includes(b.tipo) ? b.tipo : 'outro';
    const o = { id: crypto.randomBytes(5).toString('hex'), at: Date.now(), type, ref: cl(b.ref || (type === 'tattoo' ? b.ref_tattoo : type === 'produto' ? b.ref_produto : ''), 200), name: cl(b.nome, 120), contact: cl(b.contato, 160), fields: { regiao: cl(b.regiao, 100), tamanho: cl(b.tamanho, 100), quando: cl(b.quando, 100), quantidade: cl(b.quantidade, 6) }, message: cl(b.mensagem, 3000), status: 'novo', notes: '' };
    if (!o.name || !o.contact) return json(req, res, 400, { error: 'Preencha nome e contato.' });
    store.orders.unshift(o); store.saveOrders();
    stats.record('e', req, { p: '/contato', e: 'pedido' }, ip);
    return fin({ ok: 1, id: o.id });
  }
  return json(req, res, 404, { error: 'não encontrado' });
}

// ---------- API do painel
function enrich(sum) {
  const c = store.content, sets = { flash: new Map(c.flash.map(f => [f.code.toLowerCase(), f])), prod: new Map(c.products.map(p => [p.slug, p])), proj: new Map(c.projects.map(p => [p.slug, p])) };
  const names = { '/': 'Início', '/flash': 'Flash tattoo', '/catalogo': 'Catálogo', '/portfolio': 'Portfólio', '/sobre': 'Sobre / currículo', '/contato': 'Contato', '/privacidade': 'Privacidade' };
  const out = { flash: [], produtos: [], projetos: [], paginas: [] };
  sum.pages.forEach(p => {
    let m;
    if ((m = p.path.match(/^\/flash\/(og-f-\d+)$/)) && sets.flash.has(m[1])) { const f = sets.flash.get(m[1]); out.flash.push({ label: f.code, img: media.url(f.img, 'thumb'), href: p.path, views: p.views, visitors: p.visitors }); }
    else if ((m = p.path.match(/^\/catalogo\/([^/]+)$/)) && sets.prod.has(m[1])) { const x = sets.prod.get(m[1]); out.produtos.push({ label: x.title, img: x.images && x.images[0] && media.url(x.images[0], 'thumb'), href: p.path, views: p.views, visitors: p.visitors }); }
    else if ((m = p.path.match(/^\/portfolio\/([^/]+)$/)) && sets.proj.has(m[1])) { const x = sets.proj.get(m[1]); out.projetos.push({ label: x.title, img: x.images && x.images[0] && media.url(x.images[0], 'thumb'), href: p.path, views: p.views, visitors: p.visitors }); }
    else out.paginas.push({ label: names[p.path] || p.path, href: p.path, views: p.views, visitors: p.visitors });
  });
  Object.keys(out).forEach(k => out[k] = out[k].slice(0, 10));
  return Object.assign(sum, { tops: out, pages: undefined });
}

async function adminApi(req, res, u) {
  const p = u.pathname, ip = ipOf(req);
  if (p === '/api/login' && req.method === 'POST') {
    if (limited('l' + ip, 8, 600e3)) return json(req, res, 429, { error: 'Muitas tentativas. Aguarde alguns minutos.' });
    let b; try { b = await body(req, 2000); } catch (e) { return json(req, res, 400, { error: 'inválido' }); }
    if (!store.checkLogin(b.email, b.password)) return json(req, res, 401, { error: 'E-mail ou senha incorretos.' });
    res.setHeader('Set-Cookie', [cookie(req, 'og_s', makeToken(), 14 * 86400, true), cookie(req, 'og_me', '1', 365 * 86400, true)]);
    return json(req, res, 200, { ok: 1 });
  }
  if (p === '/api/logout') { res.setHeader('Set-Cookie', cookie(req, 'og_s', '', 0, true)); return json(req, res, 200, { ok: 1 }); }
  if (!authed(req)) return json(req, res, 401, { error: 'login' });
  if (req.method !== 'GET' && req.headers['x-panel'] !== '1') return json(req, res, 403, { error: 'bloqueado' });
  let m;
  if (p === '/api/admin/me') return json(req, res, 200, { email: store.email, novos: store.orders.filter(o => o.status === 'novo').length });
  if (p === '/api/admin/content' && req.method === 'GET') return json(req, res, 200, store.content);
  if ((m = p.match(/^\/api\/admin\/content\/(\w+)$/)) && req.method === 'PUT') {
    let b; try { b = await body(req, 5e6); } catch (e) { return json(req, res, 413, { error: 'Dados grandes demais.' }); }
    try { store.saveSection(m[1], b.value); } catch (e) { return json(req, res, 400, { error: e.message }); }
    return json(req, res, 200, { ok: 1 });
  }
  if (p === '/api/admin/media' && req.method === 'GET') { const refs = new Set(); files.forEach(k => { if (k.endsWith('|thumb')) refs.add(k.slice(0, -6)); }); return json(req, res, 200, { refs: [...refs].sort().reverse() }); }
  if (p === '/api/admin/upload' && req.method === 'POST') {
    let b; try { b = await body(req, 9e6); } catch (e) { return json(req, res, 413, { error: 'Imagem grande demais.' }); }
    const dec = d => { const mm = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(String(d)); if (!mm) throw new Error('formato inválido'); const buf = Buffer.from(mm[2], 'base64'); const ok = mm[1] === 'webp' ? buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP' : mm[1] === 'png' ? buf[0] === 0x89 && buf[1] === 0x50 : buf[0] === 0xff && buf[1] === 0xd8; if (!ok) throw new Error('imagem inválida'); return [buf, mm[1] === 'jpeg' ? 'jpg' : mm[1]]; };
    try {
      const [w, ext] = dec(b.web), [t, ext2] = dec(b.thumb); if (ext !== ext2) throw new Error('formatos diferentes');
      const id = 'u' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex'), name = `${id}.${ext}`;
      fs.writeFileSync(path.join(DATA, 'uploads', 'web', name), w); fs.writeFileSync(path.join(DATA, 'uploads', 'thumb', name), t); scan();
      return json(req, res, 200, { ref: 'u/' + name });
    } catch (e) { return json(req, res, 400, { error: e.message }); }
  }
  if (p === '/api/admin/stats') return json(req, res, 200, enrich(stats.summary(u.searchParams.get('days'))));
  if (p === '/api/admin/orders' && req.method === 'GET') return json(req, res, 200, store.orders);
  if (p === '/api/admin/orders.csv') {
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const rows = [['Data', 'Tipo', 'Item', 'Nome', 'Contato', 'Região', 'Tamanho', 'Quando', 'Qtd', 'Mensagem', 'Status', 'Notas'].map(q).join(',')].concat(store.orders.map(o => [new Date(o.at).toLocaleString('pt-BR'), o.type, o.ref, o.name, o.contact, o.fields.regiao, o.fields.tamanho, o.fields.quando, o.fields.quantidade, o.message, o.status, o.notes].map(q).join(',')));
    return send(req, res, 200, '\ufeff' + rows.join('\r\n'), 'text/csv; charset=utf-8', { 'Content-Disposition': 'attachment; filename="pedidos.csv"' });
  }
  if ((m = p.match(/^\/api\/admin\/orders\/(\w+)$/))) {
    const i = store.orders.findIndex(o => o.id === m[1]); if (i < 0) return json(req, res, 404, { error: 'não encontrado' });
    if (req.method === 'DELETE') { store.orders.splice(i, 1); store.saveOrders(); return json(req, res, 200, { ok: 1 }); }
    if (req.method === 'PATCH') { let b; try { b = await body(req, 10000); } catch (e) { return json(req, res, 400, { error: 'inválido' }); } const o = store.orders[i]; if (['novo', 'conversando', 'fechado', 'descartado'].includes(b.status)) o.status = b.status; if (typeof b.notes === 'string') o.notes = b.notes.slice(0, 2000); store.saveOrders(); return json(req, res, 200, o); }
  }
  if (p === '/api/admin/password' && req.method === 'POST') {
    let b; try { b = await body(req, 2000); } catch (e) { return json(req, res, 400, { error: 'inválido' }); }
    if (!store.checkLogin(store.email, b.current)) return json(req, res, 400, { error: 'Senha atual incorreta.' });
    if (String(b.password || '').length < 8) return json(req, res, 400, { error: 'A nova senha precisa ter ao menos 8 caracteres.' });
    store.setPassword(String(b.email || store.email).trim(), b.password); return json(req, res, 200, { ok: 1 });
  }
  if (p === '/api/admin/backup') return send(req, res, 200, JSON.stringify({ content: store.content, orders: store.orders }, null, 1), MIME['.json'], { 'Content-Disposition': `attachment; filename="ogeid-backup-${new Date().toISOString().slice(0, 10)}.json"` });
  return json(req, res, 404, { error: 'não encontrado' });
}

// ---------- roteador
const html = (req, res, s, code) => s == null ? html(req, res, views.notfound(store.content), 404) : send(req, res, code || 200, s, MIME['.html'], { 'Cache-Control': 'no-cache' });
http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x'); let p = u.pathname.replace(/\/index\.html$/, '/').replace(/(.)\/+$/, '$1'); const q = Object.fromEntries(u.searchParams), c = store.content, GET = req.method === 'GET' || req.method === 'HEAD';
    if (p === '/api/login' || p === '/api/logout' || p.startsWith('/api/admin/')) return adminApi(req, res, Object.assign(u, { pathname: p }));
    if (p.startsWith('/api/')) return publicApi(req, res, u);
    if (!GET) return send(req, res, 405, 'Método não permitido', MIME['.txt']);
    if (p === '/health') return send(req, res, 200, 'ok', MIME['.txt']);

    // arquivos
    if (p.startsWith('/media/u/')) { if (serveFile(req, res, path.join(DATA, 'uploads'), p.slice(9), 'public,max-age=31536000,immutable')) return; }
    else if (p.startsWith('/media/')) { if (serveFile(req, res, path.join(ROOT, 'media'), p.slice(7), 'public,max-age=2592000')) return; }
    else if (p.startsWith('/css/') || p.startsWith('/js/')) { if (serveFile(req, res, path.join(ROOT, 'public'), p.slice(1), 'no-cache')) return; }
    if (p === '/painel') { res.setHeader('X-Robots-Tag', 'noindex'); return send(req, res, 200, fs.readFileSync(path.join(ROOT, 'painel', 'index.html')), MIME['.html'], { 'Cache-Control': 'no-cache', 'X-Robots-Tag': 'noindex' }); }
    if (p.startsWith('/painel/')) { if (serveFile(req, res, path.join(ROOT, 'painel'), p.slice(8), 'no-cache')) return; }
    if (p === '/robots.txt') return send(req, res, 200, `User-agent: *\nDisallow: /painel\nDisallow: /api/\nSitemap: ${process.env.SITE_URL || ''}/sitemap.xml\n`, MIME['.txt']);
    if (p === '/sitemap.xml') return send(req, res, 200, views.sitemap(c, process.env.SITE_URL || (isHttps(req) ? 'https://' : 'http://') + req.headers.host), MIME['.xml']);
    if (p === '/favicon.ico') return redirect(res, '/media/favicon.svg', 302);

    // páginas
    let m;
    if (p === '/') return html(req, res, views.home(c));
    if (p === '/flash') return html(req, res, views.flash(c));
    if ((m = p.match(/^\/flash\/([\w-]+)$/))) return html(req, res, views.flashItem(c, m[1].toLowerCase()));
    if (p === '/catalogo') return html(req, res, views.catalogo(c, q));
    if ((m = p.match(/^\/catalogo\/c-([\w-]+)$/))) { const k = [...new Set(c.products.map(x => x.cat))].find(x => slug(x) === m[1]); return redirect(res, '/catalogo' + (k ? '?cat=' + encodeURIComponent(k) : '')); }
    if ((m = p.match(/^\/catalogo\/([\w-]+)$/))) return html(req, res, views.produto(c, m[1]));
    if (p === '/portfolio') return html(req, res, views.portfolio(c, q));
    if ((m = p.match(/^\/portfolio\/c-([\w-]+)$/))) { const k = [...new Set(c.projects.map(x => x.cat))].find(x => slug(x) === m[1]); return redirect(res, '/portfolio' + (k ? '?cat=' + encodeURIComponent(k) : '')); }
    if ((m = p.match(/^\/portfolio\/([\w-]+)$/))) return html(req, res, views.projeto(c, m[1]));
    if (p === '/sobre') return html(req, res, views.sobre(c));
    if (p === '/curriculo') return redirect(res, '/sobre#curriculo');
    if (p === '/contato') return html(req, res, views.contato(c, q));
    if (p === '/agendar') return redirect(res, '/contato?tipo=tattoo' + (q.flash ? '&flash=' + encodeURIComponent(q.flash) : ''));
    if (p === '/privacidade') return html(req, res, views.privacidade(c));
    html(req, res, null);
  } catch (e) { console.error(e); try { send(req, res, 500, 'Erro interno', MIME['.txt']); } catch (x) { } }
}).listen(PORT, () => {
  console.log(`OGEID no ar:  http://localhost:${PORT}   (painel: /painel)`);
  if (store.generated) console.log(`\n>>> Primeiro acesso ao painel\n    e-mail: ${store.generated.email}\n    senha:  ${store.generated.pw}\n    (troque a senha em Configurações)\n`);
});
