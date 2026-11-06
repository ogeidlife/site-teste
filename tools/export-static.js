'use strict';
// Gera uma versão ESTÁTICA do site (vitrine somente-leitura) para o GitHub Pages: docs/index.html + páginas.
//   node tools/export-static.js [--out=docs] [--base-url=https://usuario.github.io/repo] [--whatsapp=5511999999999] [--email=voce@x.com]
// Usa o banco indicado em DATA_DIR (se não houver, usa um banco novo com os dados iniciais).
// Na versão estática NÃO existem painel, banco nem formulários: agendamento, encomenda e contato viram uma
// mensagem pronta para enviar por Instagram, WhatsApp ou e-mail. O site completo continua sendo o `node server.js`.
const fs = require('fs'), path = require('path'), os = require('os');
const arg = (k, d = '') => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', 'docs')), ROOT = path.join(__dirname, '..'), PORT = 3999;
if (!process.env.DATA_DIR) process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ogeid-export-'));
process.env.PORT = String(PORT); process.env.HOST = '127.0.0.1';
const D = require('../src/db');
require('../server.js');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = s => D.slugify(decodeURIComponent(String(s)));
const unesc = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const pages = new Map(); // caminho público (ex.: /flash/og-f-0001) → HTML original
const get = async p => { const r = await fetch(`http://127.0.0.1:${PORT}${p}`); if (r.status !== 200) throw new Error(`${p} → ${r.status}`); return r.text(); };
const mapUrl = (u, depth) => {
  const m = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(u); let p = m[1], qs = m[2] || '', h = m[3] || '';
  const up = '../'.repeat(depth);
  if (/^\/(css|js|media|uploads)\//.test(p) || /\.(xml|txt|svg|pdf)$/.test(p)) return up + p.slice(1) + qs + h;
  const sp = new URLSearchParams(unesc(qs));
  if ((p === '/catalogo' || p === '/portfolio') && sp.get('cat')) { p += '/c-' + slug(sp.get('cat')); qs = ''; }
  else if (p !== '/agendar') qs = '';
  return up + (p === '/' ? '' : p.slice(1) + '/') + 'index.html' + qs + h;
};
function staticBlock(kind, S, info) {
  const wa = S.whatsapp ? S.whatsapp.replace(/\D/g, '') : '', mail = S.email || '';
  const T = {
    agendar: ['Solicitar agendamento', `Olá! Quero solicitar o agendamento de uma tatuagem.\n\nFlash (código): {flash}\nTamanho desejado: \nRegião do corpo: \nPreferência de data: \nObservações: \n\nNome: \nContato: `, 'Solicitação de agendamento de tatuagem'],
    produto: ['Solicitar encomenda', `Olá! Quero encomendar: ${info.name} (código ${info.code}).\n\nQuantidade: 1\nPersonalização: \nObservações: \n\nNome: \nContato: `, `Encomenda: ${info.name}`],
    contato: ['Enviar mensagem', `Olá! \n\n\nNome: \nContato: `, 'Contato pelo site'],
  }[kind];
  return `<div class="form static-contact" data-contact><h3>${esc(T[0])}</h3>
<p>Escreva sua mensagem abaixo e envie pelo canal de sua preferência. O artista responde e combina disponibilidade, valor, prazo e data. Nenhum pagamento é feito neste site.</p>
<label>Mensagem<textarea rows="10">${esc(T[1])}</textarea></label>
<div class="row"><a class="btn" data-send="ig" href="${esc(S.instagram)}" target="_blank" rel="noopener">Copiar mensagem e abrir Instagram</a>
${wa ? `<a class="btn ghost" data-send="wa" data-num="${wa}" href="https://wa.me/${wa}" target="_blank" rel="noopener">Enviar por WhatsApp</a>` : ''}
${mail ? `<a class="btn ghost" data-send="mail" data-to="${esc(mail)}" data-subject="${esc(T[2])}" href="mailto:${esc(mail)}">Enviar por e-mail</a>` : ''}</div>
<p class="muted small" data-copied hidden role="status">Mensagem copiada! Cole na conversa do Instagram.</p></div>`;
}
function transform(pubPath, html, S) {
  const depth = pubPath === '/' ? 0 : pubPath.split('/').filter(Boolean).length;
  const kind = pubPath === '/agendar' ? 'agendar' : pubPath === '/contato' ? 'contato' : /^\/catalogo\/[^c]|^\/catalogo\/c[^-]/.test(pubPath) ? 'produto' : null;
  html = html.replace(/<form class="form"[^>]*>[\s\S]*?<\/form>/, f => staticBlock(kind || 'contato', S, { name: unesc((/<h1 class="display sm">([^<]*)</.exec(html) || [])[1] || ''), code: (/name="product" value="([^"]+)"/.exec(f) || [])[1] || '' }));
  html = html.replace(/<nav class="pager"[\s\S]*?<\/nav>/g, '').replace(/<a href="\/sitemap\.xml">[^<]*<\/a>/, '')
    .replace('Este formulário envia uma solicitação', 'Sua mensagem é uma solicitação').replace(/<body class="/, '<body data-static class="');
  return html.replace(/(href|src|action|data-full)="(\/[^"]*)"/g, (_, a, u) => `${a}="${mapUrl(u, depth)}"`);
}

(async () => {
  for (let i = 0; i < 40; i++) { try { await get('/'); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
  if (arg('whatsapp')) D.setSetting('whatsapp', arg('whatsapp').replace(/\D/g, ''));
  if (arg('email')) D.setSetting('email', arg('email'));
  if (arg('base-url')) D.setSetting('site_url', arg('base-url'));
  const S = D.allSettings();
  const add = async (p, src) => pages.set(p, await get(src || p));
  for (const p of ['/', '/catalogo', '/portfolio', '/sobre', '/curriculo', '/contato', '/agendar', '/privacidade']) await add(p);
  await add('/flash', '/flash?all=1');
  for (const base of ['/catalogo', '/portfolio']) for (const m of pages.get(base).matchAll(new RegExp(`href="${base}\\?cat=([^"]+)"`, 'g'))) await add(`${base}/c-${slug(unesc(m[1]))}`, `${base}?cat=${encodeURIComponent(unesc(m[1]))}`);
  for (const m of pages.get('/flash').matchAll(/href="\/flash\/(og-f-[\w-]+)"/g)) await add(`/flash/${m[1]}`);
  for (const m of pages.get('/catalogo').matchAll(/href="\/catalogo\/([\w-]+)"/g)) await add(`/catalogo/${m[1]}`);
  for (const m of pages.get('/portfolio').matchAll(/href="\/portfolio\/([\w-]+)"/g)) await add(`/portfolio/${m[1]}`);

  fs.rmSync(OUT, { recursive: true, force: true });
  for (const [p, html] of pages) { const f = path.join(OUT, p === '/' ? '' : p, 'index.html'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, transform(p, html, S)); }
  for (const d of ['css', 'js', 'media']) fs.cpSync(path.join(ROOT, 'public', d), path.join(OUT, d), { recursive: true });
  const up = path.join(D.DATA, 'uploads'); if (fs.existsSync(up)) fs.cpSync(up, path.join(OUT, 'uploads'), { recursive: true });
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
  const base = (S.site_url || '').replace(/\/$/, '');
  if (base) fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...pages.keys()].map(p => `<url><loc>${esc(base + (p === '/' ? '/' : p + '/'))}</loc></url>`).join('')}</urlset>`);
  console.log(`Site estático gerado em ${OUT} — ${pages.size} páginas. Abra ${path.join(OUT, 'index.html')}`);
  process.exit(0);
})().catch(e => { console.error('Falha na exportação:', e.message); process.exit(1); });
