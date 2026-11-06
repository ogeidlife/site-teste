'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const D = require('./db'), { q, setSetting, slugify, uniqueSlug, FLASH_STATUS, PRODUCT_STATUS, BOOKING_STATUS, ORDER_STATUS, CONTACT_STATUS, CV_SECTIONS } = D;
const L = require('./lib'), { html, raw, esc, brl, jparse, fmtDate } = L;

const routes = []; const R = (m, re, fn) => routes.push({ method: m, re, fn });
const arr = x => [].concat(x ?? []);
const csrf = ctx => raw(`<input type="hidden" name="_csrf" value="${ctx.session ? ctx.session.csrf : ''}">`);
const MENU = [['/painel', 'Resumo'], ['/painel/agendamentos', 'Agendamentos'], ['/painel/encomendas', 'Encomendas'], ['/painel/contatos', 'Mensagens'], ['/painel/flash', 'Flash tattoo'], ['/painel/produtos', 'Catálogo'], ['/painel/portfolio', 'Portfólio'], ['/painel/categorias', 'Categorias'], ['/painel/curriculo', 'Currículo'], ['/painel/config', 'Configurações'], ['/painel/conta', 'Minha conta']];
function shell(ctx, title, body, flash) {
  const n = { b: q.get("SELECT COUNT(*) c FROM bookings WHERE status='novo'").c, o: q.get("SELECT COUNT(*) c FROM orders WHERE status='nova'").c, c: q.get("SELECT COUNT(*) c FROM contacts WHERE status='novo'").c };
  const cnt = { '/painel/agendamentos': n.b, '/painel/encomendas': n.o, '/painel/contatos': n.c };
  const msg = flash || ctx.query.msg;
  return { body: html`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} — Painel OGEID</title><link rel="stylesheet" href="/css/style.css"></head>
<body class="admin"><aside class="a-side"><a class="logo" href="/painel">OGEID <small>painel</small></a><nav>${MENU.map(([h, t]) => html`<a href="${h}" ${(h === '/painel' ? ctx.url.pathname === h : ctx.url.pathname.startsWith(h)) ? raw('aria-current="page"') : ''}>${t}${cnt[h] ? html` <b class="dot">${cnt[h]}</b>` : ''}</a>`)}</nav>
<a class="small" href="/" target="_blank">Ver site ↗</a><form method="post" action="/painel/sair">${csrf(ctx)}<button class="link">Sair (${ctx.session.email})</button></form></aside>
<main class="a-main"><h1>${title}</h1>${msg ? html`<p class="alert ok" role="status">${msg}</p>` : ''}${body}</main><script src="/js/site.js" defer></script></body></html>` };
}
const f = (label, name, val = '', o = {}) => html`<label class="${o.cls || ''}">${label}${o.type === 'textarea' ? html`<textarea name="${name}" rows="${o.rows || 4}">${val}</textarea>` : html`<input name="${name}" type="${o.type || 'text'}" value="${val}" ${o.list ? raw(`list="${o.list}"`) : ''} ${o.ph ? raw(`placeholder="${esc(o.ph)}"`) : ''} ${o.req ? 'required' : ''} ${o.step ? raw(`step="${o.step}"`) : ''}>`}${o.hint ? html`<small>${o.hint}</small>` : ''}</label>`;
const sel = (label, name, map, val, o = {}) => html`<label>${label}<select name="${name}">${o.blank ? html`<option value="">—</option>` : ''}${(Array.isArray(map) ? map.map(x => [x, x]) : Object.entries(map)).map(([k, v]) => html`<option value="${k}" ${String(val) === k ? raw('selected') : ''}>${v}</option>`)}</select></label>`;
const chk = (label, name, on) => html`<label class="check"><input type="checkbox" name="${name}" value="1" ${on ? raw('checked') : ''}> ${label}</label>`;
const cats = kind => q.all('SELECT name FROM categories WHERE kind=? ORDER BY sort,name', kind).map(r => r.name);
const pg = (ctx, total, per, p) => { const pages = Math.ceil(total / per); if (pages < 2) return ''; const l = n => { const u = new URLSearchParams(ctx.url.searchParams); u.set('p', n); return '?' + u; }; return html`<nav class="pager">${p > 1 ? html`<a href="${l(p - 1)}">← Anterior</a>` : ''}<span>${p} / ${pages}</span>${p < pages ? html`<a href="${l(p + 1)}">Próxima →</a>` : ''}</nav>`; };
const ok = (to, msg) => ({ redirect: `${to}${to.includes('?') ? '&' : '?'}msg=${encodeURIComponent(msg)}` });
const badgeS = (st, map) => html`<span class="badge s-${st}">${map[st] || st}</span>`;

// ---------- imagens (galeria editável) ----------
function imgEditor(images) {
  return html`<fieldset class="imgs"><legend>Imagens</legend><input type="hidden" name="imgs_json" value="${JSON.stringify(images)}">
${images.length ? html`<div class="img-list">${images.map((im, i) => html`<div class="img-it"><img src="${im.thumb || im.web}" alt=""><label>Ordem<input type="number" name="ord_${i}" value="${i + 1}"></label>${chk('Remover', 'del_' + i, false)}</div>`)}</div><p class="muted small">A primeira (menor ordem) é a imagem principal.</p>` : ''}
<label>Adicionar imagens<input type="file" name="new_images" accept="image/*" multiple></label></fieldset>`;
}
async function collectImages(ctx) {
  const F = ctx.fields; let old = jparse(F.imgs_json); const keep = [];
  old.forEach((im, i) => { if (!F['del_' + i] && /^\/(media|uploads)\//.test(im.web || '')) keep.push({ im, o: Number(F['ord_' + i]) || i + 1 }); });
  keep.sort((a, b) => a.o - b.o); const out = keep.map(k => k.im);
  for (const file of ctx.files.filter(x => x.field === 'new_images')) out.push(await L.saveImage(file, 'images'));
  return out;
}

// ---------- login ----------
const loginPage = (ctx, err) => ({ body: html`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Entrar — Painel OGEID</title><link rel="stylesheet" href="/css/style.css"></head>
<body class="admin login"><form class="form" method="post" action="/painel/login"><div class="logo big">OGEID</div><p class="eyebrow">Painel administrativo</p>${err ? html`<p class="alert" role="alert">${err}</p>` : ''}
<label>E-mail<input type="email" name="email" autocomplete="username" required autofocus></label><label>Senha<input type="password" name="password" autocomplete="current-password" required></label><button class="btn" type="submit">Entrar</button></form></body></html>` });
R('GET', /^\/painel\/login$/, ctx => ctx.session ? { redirect: '/painel' } : loginPage(ctx));
R('POST', /^\/painel\/login$/, ctx => {
  const ip = L.ipHash(ctx.req), email = String(ctx.fields.email || '').trim().toLowerCase();
  if (!L.rateLimit('login' + ip, 8, 600e3) || !L.rateLimit('loginu' + email, 8, 600e3)) return { status: 429, ...loginPage(ctx, 'Muitas tentativas. Aguarde 10 minutos.') };
  const u = q.get('SELECT * FROM users WHERE email=?', email);
  const good = u ? L.checkPw(String(ctx.fields.password || ''), u.pass_hash) : (L.hashPw('x'), false);
  if (!good) return { status: 401, ...loginPage(ctx, 'E-mail ou senha incorretos.') };
  const t = L.newSession(u.id);
  return { redirect: '/painel', cookie: `ogeid_sid=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${L.SESSION_MS / 1000}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}` };
});
R('POST', /^\/painel\/sair$/, ctx => { q.run('DELETE FROM sessions WHERE token=?', ctx.session.token); return { redirect: '/painel/login', cookie: 'ogeid_sid=; HttpOnly; Path=/; Max-Age=0' }; });

// ---------- resumo ----------
R('GET', /^\/painel\/?$/, ctx => {
  const c = t => q.get(`SELECT COUNT(*) c FROM ${t}`).c, bk = q.all('SELECT * FROM bookings ORDER BY id DESC LIMIT 6');
  const st = q.all('SELECT status, COUNT(*) c FROM flash GROUP BY status');
  return shell(ctx, 'Resumo', html`<div class="cards">
<a class="stat" href="/painel/agendamentos?status=novo"><b>${q.get("SELECT COUNT(*) c FROM bookings WHERE status='novo'").c}</b><span>agendamentos novos</span></a>
<a class="stat" href="/painel/encomendas?status=nova"><b>${q.get("SELECT COUNT(*) c FROM orders WHERE status='nova'").c}</b><span>encomendas novas</span></a>
<a class="stat" href="/painel/contatos?status=novo"><b>${q.get("SELECT COUNT(*) c FROM contacts WHERE status='novo'").c}</b><span>mensagens novas</span></a>
<a class="stat" href="/painel/flash"><b>${c('flash')}</b><span>flash tattoos</span></a><a class="stat" href="/painel/produtos"><b>${c('products')}</b><span>produtos</span></a><a class="stat" href="/painel/portfolio"><b>${c('projects')}</b><span>projetos</span></a></div>
<h2>Flash por status</h2><p>${st.map(s => html`${badgeS(s.status, FLASH_STATUS)} ${s.c} &nbsp; `)}</p>
<h2>Últimas solicitações de agendamento</h2>${bk.length ? html`<table class="tbl"><tr><th>#</th><th>Data</th><th>Nome</th><th>Flash</th><th>Status</th></tr>${bk.map(b => html`<tr><td><a href="/painel/agendamentos/${b.id}">${b.id}</a></td><td>${fmtDate(b.created)}</td><td>${b.name}</td><td>${b.flash_code || 'Personalizada'}</td><td>${badgeS(b.status, BOOKING_STATUS)}</td></tr>`)}</table>` : html`<p class="muted">Nenhuma solicitação ainda.</p>`}`);
});

// ---------- solicitações (agendamentos / encomendas / mensagens) ----------
function requests(kind, table, title, STATUS, cols, one) {
  R('GET', new RegExp(`^/painel/${kind}$`), ctx => {
    const stt = ctx.query.status || '', p = Math.max(1, parseInt(ctx.query.p) || 1), per = 30, args = []; let W = '1=1';
    if (stt) { W += ' AND status=?'; args.push(stt); } if (ctx.query.q) { W += ' AND (name LIKE ? OR email LIKE ?)'; args.push(`%${ctx.query.q}%`, `%${ctx.query.q}%`); }
    const total = q.get(`SELECT COUNT(*) c FROM ${table} WHERE ${W}`, ...args).c, rows = q.all(`SELECT * FROM ${table} WHERE ${W} ORDER BY id DESC LIMIT ? OFFSET ?`, ...args, per, (p - 1) * per);
    return shell(ctx, title, html`<form class="filters" method="get"><label>Status<select name="status"><option value="">Todos</option>${Object.entries(STATUS).map(([k, v]) => html`<option value="${k}" ${stt === k ? raw('selected') : ''}>${v}</option>`)}</select></label><label>Buscar<input name="q" value="${ctx.query.q || ''}" placeholder="Nome ou e-mail"></label><button class="btn sm">Filtrar</button></form>
<table class="tbl"><tr><th>#</th><th>Recebido</th>${cols.map(c => html`<th>${c[0]}</th>`)}<th>Status</th></tr>${rows.map(r => html`<tr><td><a href="/painel/${kind}/${r.id}">${r.id}</a></td><td>${fmtDate(r.created)}</td>${cols.map(c => html`<td>${c[1](r)}</td>`)}<td>${badgeS(r.status, STATUS)}</td></tr>`)}</table>${rows.length ? '' : html`<p class="muted">Nada por aqui.</p>`}${pg(ctx, total, per, p)}`);
  });
  R('GET', new RegExp(`^/painel/${kind}/(\\d+)$`), (ctx, [id]) => {
    const r = q.get(`SELECT * FROM ${table} WHERE id=?`, id); if (!r) return { status: 404, body: 'Não encontrado' };
    const skip = new Set(['id', 'status', 'admin_notes', 'ip_hash', 'consent', 'refs', 'custom']);
    const labels = { created: 'Recebido', name: 'Nome', contact: 'Instagram/WhatsApp', email: 'E-mail', flash_code: 'Flash', size: 'Tamanho', body_place: 'Região', date_pref: 'Preferência de data', description: 'Descrição', product_code: 'Código do produto', product_name: 'Produto', qty: 'Quantidade', customization: 'Personalização', notes: 'Observações', message: 'Mensagem', payment_ref: 'Ref. pagamento' };
    const refs = jparse(r.refs); const fl = r.flash_code && q.get('SELECT * FROM flash WHERE code=?', r.flash_code);
    return shell(ctx, `${one} #${r.id}`, html`<p><a href="/painel/${kind}">← Voltar</a></p><div class="split">
<div><dl class="specs">${Object.keys(r).filter(k => !skip.has(k) && r[k] !== '' && r[k] != null).map(k => html`<dt>${labels[k] || k}</dt><dd>${k === 'created' ? fmtDate(r[k]) : r[k]}${k === 'flash_code' && fl ? html` — <a href="/painel/flash/${fl.id}">abrir flash</a> ${badgeS(fl.status, FLASH_STATUS)}` : ''}${k === 'email' ? html` — <a href="mailto:${r[k]}">responder</a>` : ''}</dd>`)}${r.custom ? html`<dt>Tipo</dt><dd>Tatuagem personalizada</dd>` : ''}</dl>
${fl ? html`<img class="mini" src="${fl.thumb || fl.image}" alt="${fl.code}">` : ''}${refs.length ? html`<h3>Referências enviadas</h3><div class="img-list">${refs.map(x => html`<a href="${x}" target="_blank"><img src="${x}" alt="Referência" loading="lazy"></a>`)}</div>` : ''}</div>
<form class="form" method="post" action="/painel/${kind}/${r.id}">${csrf(ctx)}${sel('Status', 'status', STATUS, r.status)}${f('Observações administrativas (privadas)', 'admin_notes', r.admin_notes, { type: 'textarea', rows: 8 })}<button class="btn" type="submit">Salvar</button></form></div>
<form method="post" action="/painel/${kind}/${r.id}/excluir" data-confirm="Excluir definitivamente este registro (dados do cliente)?">${csrf(ctx)}<button class="link danger">Excluir registro</button></form>`);
  });
  R('POST', new RegExp(`^/painel/${kind}/(\\d+)$`), (ctx, [id]) => {
    const st = ctx.fields.status; if (!STATUS[st]) return ok(`/painel/${kind}/${id}`, 'Status inválido');
    q.run(`UPDATE ${table} SET status=?, admin_notes=? WHERE id=?`, st, L.clip(ctx.fields.admin_notes, 5000), id); return ok(`/painel/${kind}/${id}`, 'Salvo.');
  });
  R('POST', new RegExp(`^/painel/${kind}/(\\d+)/excluir$`), (ctx, [id]) => { q.run(`DELETE FROM ${table} WHERE id=?`, id); return ok(`/painel/${kind}`, 'Registro excluído.'); });
}
requests('agendamentos', 'bookings', 'Agendamentos', BOOKING_STATUS, [['Nome', r => r.name], ['Flash', r => r.flash_code || 'Personalizada'], ['Região', r => r.body_place], ['Contato', r => r.contact]], 'Agendamento');
requests('encomendas', 'orders', 'Encomendas', ORDER_STATUS, [['Nome', r => r.name], ['Produto', r => `${r.product_name} ×${r.qty}`], ['Contato', r => r.contact]], 'Encomenda');
requests('contatos', 'contacts', 'Mensagens', CONTACT_STATUS, [['Nome', r => r.name], ['E-mail', r => r.email], ['Mensagem', r => r.message.slice(0, 70)]], 'Mensagem');

// ---------- FLASH ----------
R('GET', /^\/painel\/flash$/, ctx => {
  const Q = ctx.query, p = Math.max(1, parseInt(Q.p) || 1), per = 40, args = []; let W = '1=1';
  if (Q.q) { W += ' AND (code LIKE ? OR title LIKE ? OR source_file LIKE ?)'; args.push(...Array(3).fill(`%${Q.q}%`)); }
  if (Q.status) { W += ' AND status=?'; args.push(Q.status); } if (Q.cat) { W += ' AND category=?'; args.push(Q.cat); } if (Q.pub) { W += ' AND published=?'; args.push(Q.pub === '1' ? 1 : 0); }
  const total = q.get(`SELECT COUNT(*) c FROM flash WHERE ${W}`, ...args).c, rows = q.all(`SELECT * FROM flash WHERE ${W} ORDER BY sort DESC, id DESC LIMIT ? OFFSET ?`, ...args, per, (p - 1) * per);
  return shell(ctx, 'Flash tattoo', html`<p><a class="btn sm" href="/painel/flash/novo">+ Novo flash</a></p>
<form class="filters" method="get"><label>Buscar<input name="q" value="${Q.q || ''}" placeholder="Código, nome, arquivo"></label>${sel('Status', 'status', FLASH_STATUS, Q.status || '', { blank: true })}${sel('Categoria', 'cat', cats('flash'), Q.cat || '', { blank: true })}${sel('Publicação', 'pub', { 1: 'Publicados', 0: 'Ocultos' }, Q.pub || '', { blank: true })}<button class="btn sm">Filtrar</button></form>
<form method="post" action="/painel/flash/lote" id="bulk">${csrf(ctx)}<div class="bulkbar"><label><input type="checkbox" data-all> Selecionar todos</label>${sel('Ação em lote', 'action', { '': '—', 'st:disponivel': 'Marcar Disponível', 'st:reservado': 'Marcar Reservado', 'st:tatuado': 'Marcar Tatuado/Indisponível', 'st:exclusivo': 'Marcar Exclusivo', pub: 'Publicar', unpub: 'Ocultar', cat: 'Mudar categoria →', del: 'Excluir' }, '')}<input name="bulk_cat" list="fc" placeholder="Nova categoria"><datalist id="fc">${cats('flash').map(c => html`<option>${c}</option>`)}</datalist><button class="btn sm" data-confirm="Aplicar ação aos selecionados?">Aplicar</button></div>
<table class="tbl"><tr><th></th><th></th><th>Código</th><th>Título</th><th>Categoria</th><th>Preço</th><th>Status</th><th></th></tr>${rows.map(r => html`<tr class="${r.published ? '' : 'off'}"><td><input type="checkbox" name="ids" value="${r.id}"></td><td><img class="tn" loading="lazy" src="${r.thumb || r.image}" alt=""></td><td><a href="/painel/flash/${r.id}">${r.code}</a></td><td>${r.title}</td><td>${r.category}</td><td>${r.price_cents != null ? brl(r.price_cents) : '—'}</td><td>${badgeS(r.status, FLASH_STATUS)}${r.published ? '' : ' (oculto)'}</td><td><a href="/painel/flash/${r.id}">editar</a></td></tr>`)}</table></form>${pg(ctx, total, per, p)}<p class="muted">${total} registros</p>`);
});
R('POST', /^\/painel\/flash\/lote$/, ctx => {
  const ids = arr(ctx.fields.ids).map(Number).filter(Boolean), a = ctx.fields.action || ''; if (!ids.length || !a) return ok('/painel/flash', 'Nada selecionado.');
  const ph = ids.map(() => '?').join(',');
  if (a.startsWith('st:') && FLASH_STATUS[a.slice(3)]) q.run(`UPDATE flash SET status=? WHERE id IN (${ph})`, a.slice(3), ...ids);
  else if (a === 'pub') q.run(`UPDATE flash SET published=1 WHERE id IN (${ph})`, ...ids); else if (a === 'unpub') q.run(`UPDATE flash SET published=0 WHERE id IN (${ph})`, ...ids);
  else if (a === 'cat' && ctx.fields.bulk_cat) { const c = L.clip(ctx.fields.bulk_cat, 80); q.run(`UPDATE flash SET category=? WHERE id IN (${ph})`, c, ...ids); q.run("INSERT OR IGNORE INTO categories(kind,name) VALUES('flash',?)", c); }
  else if (a === 'del') q.run(`DELETE FROM flash WHERE id IN (${ph})`, ...ids); else return ok('/painel/flash', 'Ação inválida.');
  return ok('/painel/flash', `${ids.length} item(ns) atualizado(s).`);
});
const flashForm = (ctx, r, isNew) => shell(ctx, isNew ? 'Novo flash' : `Flash ${r.code}`, html`<p><a href="/painel/flash">← Voltar</a> ${isNew ? '' : html`· <a href="/flash/${r.code.toLowerCase()}" target="_blank">ver no site ↗</a>`}</p>
<form class="form wide" method="post" action="/painel/flash/${isNew ? 'novo' : r.id}" enctype="multipart/form-data">${csrf(ctx)}
<div class="split"><div>${r.image ? html`<img class="preview" src="${r.image}" alt="">` : ''}<label>${isNew ? 'Imagem do desenho *' : 'Substituir imagem'}<input type="file" name="image" accept="image/*" ${isNew ? 'required' : ''}></label>${r.source_file ? html`<p class="muted small">Arquivo de origem: ${r.source_file}</p>` : ''}</div>
<div>${f('Código', 'code', r.code, { hint: isNew ? 'Deixe em branco para gerar automaticamente.' : 'Alterar o código muda o link público do desenho.' })}${f('Nome / identificação', 'title', r.title)}
<div class="two">${f('Categoria', 'category', r.category, { list: 'fc' })}${f('Estilo', 'style', r.style)}</div><datalist id="fc">${cats('flash').map(c => html`<option>${c}</option>`)}</datalist>
<div class="two">${f('Tamanho (rótulo)', 'size_label', r.size_label, { ph: 'P, M, G…' })}${f('Dimensões aproximadas', 'dimensions', r.dimensions, { ph: 'ex.: 8 × 10 cm' })}</div>
${f('Localização corporal sugerida', 'body_place', r.body_place)}${f('Descrição', 'description', r.description, { type: 'textarea' })}
<div class="two">${f('Valor da tatuagem (R$)', 'price', L.moneyInput(r.price_cents), { ph: 'vazio = a combinar' })}${sel('Disponibilidade', 'status', FLASH_STATUS, r.status)}</div>
<div class="two">${f('Ano', 'year', r.year)}${f('Ordem de exibição', 'sort', r.sort, { type: 'number', hint: 'Maior número aparece primeiro.' })}</div>${chk('Publicado no site', 'published', r.published)}<button class="btn" type="submit">Salvar</button></div></div></form>
${isNew ? '' : html`<form method="post" action="/painel/flash/${r.id}/excluir" data-confirm="Excluir este flash?">${csrf(ctx)}<button class="link danger">Excluir flash</button></form>`}`);
R('GET', /^\/painel\/flash\/novo$/, ctx => flashForm(ctx, { code: '', title: '', category: '', style: '', size_label: '', dimensions: '', body_place: '', description: '', price_cents: null, status: 'disponivel', year: String(new Date().getFullYear()), sort: (q.get('SELECT COALESCE(MAX(sort),0)+1 n FROM flash').n), published: 1 }, true));
R('GET', /^\/painel\/flash\/(\d+)$/, (ctx, [id]) => { const r = q.get('SELECT * FROM flash WHERE id=?', id); return r ? flashForm(ctx, r, false) : { status: 404, body: 'Não encontrado' }; });
async function saveFlash(ctx, id) {
  const F = ctx.fields, price = L.parseMoney(F.price); const st = FLASH_STATUS[F.status] ? F.status : 'disponivel';
  let code = L.clip(F.code, 40).toUpperCase().replace(/[^A-Z0-9-]/g, '') || `OG-F-${String((q.get("SELECT COUNT(*) c FROM flash").c) + 1).padStart(4, '0')}`;
  if (q.get('SELECT id FROM flash WHERE code=? AND id<>?', code, id || 0)) return ok(id ? `/painel/flash/${id}` : '/painel/flash/novo', `O código ${code} já existe.`);
  let img = null; const file = ctx.files.find(x => x.field === 'image');
  if (file) try { img = await L.saveImage(file, 'flash'); } catch (e) { return ok(id ? `/painel/flash/${id}` : '/painel/flash/novo', e.message); }
  const cat = L.clip(F.category, 80); if (cat) q.run("INSERT OR IGNORE INTO categories(kind,name) VALUES('flash',?)", cat);
  const v = [code, L.clip(F.title, 120), cat, L.clip(F.style, 80), L.clip(F.size_label, 40), L.clip(F.dimensions, 80), L.clip(F.body_place, 120), L.clip(F.description, 2000), price, st, L.clip(F.year, 20), F.published ? 1 : 0, parseInt(F.sort) || 0];
  if (id) { q.run('UPDATE flash SET code=?,title=?,category=?,style=?,size_label=?,dimensions=?,body_place=?,description=?,price_cents=?,status=?,year=?,published=?,sort=? WHERE id=?', ...v, id); if (img) q.run('UPDATE flash SET image=?,thumb=? WHERE id=?', img.web, img.thumb, id); return ok(`/painel/flash/${id}`, 'Flash salvo.'); }
  if (!img) return ok('/painel/flash/novo', 'Envie a imagem do desenho.');
  const r = q.run('INSERT INTO flash(code,title,category,style,size_label,dimensions,body_place,description,price_cents,status,year,published,sort,image,thumb) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', ...v, img.web, img.thumb);
  return ok(`/painel/flash/${Number(r.lastInsertRowid)}`, 'Flash criado.');
}
R('POST', /^\/painel\/flash\/novo$/, ctx => saveFlash(ctx, 0));
R('POST', /^\/painel\/flash\/(\d+)$/, (ctx, [id]) => saveFlash(ctx, Number(id)));
R('POST', /^\/painel\/flash\/(\d+)\/excluir$/, (ctx, [id]) => { q.run('DELETE FROM flash WHERE id=?', id); return ok('/painel/flash', 'Flash excluído.'); });

// ---------- PRODUTOS ----------
R('GET', /^\/painel\/produtos$/, ctx => {
  const rows = q.all('SELECT * FROM products ORDER BY sort, id');
  return shell(ctx, 'Catálogo', html`<p><a class="btn sm" href="/painel/produtos/novo">+ Novo produto</a></p><table class="tbl"><tr><th></th><th>Código</th><th>Nome</th><th>Categoria</th><th>Preço</th><th>Status</th><th>Estoque</th><th></th></tr>${rows.map(r => { const im = jparse(r.images)[0]; return html`<tr class="${r.published ? '' : 'off'}"><td>${im ? html`<img class="tn" src="${im.thumb || im.web}" alt="">` : ''}</td><td>${r.code}</td><td><a href="/painel/produtos/${r.id}">${r.name}</a></td><td>${r.category}</td><td>${r.price_cents != null ? brl(r.price_cents) : '—'}</td><td>${badgeS(r.status, PRODUCT_STATUS)}${r.published ? '' : ' (rascunho)'}</td><td>${r.stock ?? '—'}</td><td><a href="/painel/produtos/${r.id}">editar</a></td></tr>`; })}</table>`);
});
const prodForm = (ctx, r, isNew) => shell(ctx, isNew ? 'Novo produto' : r.name, html`<p><a href="/painel/produtos">← Voltar</a> ${isNew ? '' : html`· <a href="/catalogo/${r.slug}" target="_blank">ver no site ↗</a>`}</p>
<form class="form wide" method="post" action="/painel/produtos/${isNew ? 'novo' : r.id}" enctype="multipart/form-data">${csrf(ctx)}<div class="split"><div>${imgEditor(jparse(r.images))}</div><div>
${f('Nome *', 'name', r.name, { req: 1 })}<div class="two">${f('Código', 'code', r.code, { hint: 'Vazio = automático' })}${sel('Categoria', 'category', cats('produto'), r.category, { blank: true })}</div>${f('Descrição', 'description', r.description, { type: 'textarea', rows: 6 })}
<div class="two">${f('Preço (R$)', 'price', L.moneyInput(r.price_cents), { ph: 'vazio = sob consulta' })}${sel('Disponibilidade', 'status', PRODUCT_STATUS, r.status)}</div>
<div class="two">${f('Dimensões', 'dimensions', r.dimensions)}${f('Materiais', 'materials', r.materials)}</div><div class="two">${f('Estoque (se aplicável)', 'stock', r.stock ?? '', { type: 'number' })}${f('Ordem', 'sort', r.sort, { type: 'number' })}</div>
${chk('Publicado no site', 'published', r.published)}<button class="btn" type="submit">Salvar</button></div></div></form>${isNew ? '' : html`<form method="post" action="/painel/produtos/${r.id}/excluir" data-confirm="Excluir este produto?">${csrf(ctx)}<button class="link danger">Excluir produto</button></form>`}`);
R('GET', /^\/painel\/produtos\/novo$/, ctx => prodForm(ctx, { name: '', code: '', category: '', description: '', price_cents: null, status: 'sob_consulta', dimensions: '', materials: '', stock: null, images: '[]', published: 1, sort: q.get('SELECT COALESCE(MAX(sort),0)+1 n FROM products').n }, true));
R('GET', /^\/painel\/produtos\/(\d+)$/, (ctx, [id]) => { const r = q.get('SELECT * FROM products WHERE id=?', id); return r ? prodForm(ctx, r, false) : { status: 404, body: 'Não encontrado' }; });
async function saveProd(ctx, id) {
  const F = ctx.fields, name = L.clip(F.name, 140); const back = id ? `/painel/produtos/${id}` : '/painel/produtos/novo'; if (!name) return ok(back, 'Informe o nome.');
  let code = L.clip(F.code, 40).toUpperCase().replace(/[^A-Z0-9-]/g, '') || `OG-P-${String(q.get('SELECT COALESCE(MAX(id),0)+1 n FROM products').n).padStart(3, '0')}`;
  if (q.get('SELECT id FROM products WHERE code=? AND id<>?', code, id)) return ok(back, `O código ${code} já existe.`);
  let images; try { images = await collectImages(ctx); } catch (e) { return ok(back, e.message); }
  const st = PRODUCT_STATUS[F.status] ? F.status : 'sob_consulta', stock = F.stock === '' || F.stock == null ? null : Math.max(0, parseInt(F.stock) || 0);
  const v = [code, name, L.clip(F.category, 80), L.clip(F.description, 4000), L.parseMoney(F.price), L.clip(F.dimensions, 120), L.clip(F.materials, 200), st, stock, JSON.stringify(images), F.published ? 1 : 0, parseInt(F.sort) || 0];
  if (id) { q.run('UPDATE products SET code=?,name=?,category=?,description=?,price_cents=?,dimensions=?,materials=?,status=?,stock=?,images=?,published=?,sort=? WHERE id=?', ...v, id); return ok(`/painel/produtos/${id}`, 'Produto salvo.'); }
  const r = q.run('INSERT INTO products(code,name,category,description,price_cents,dimensions,materials,status,stock,images,published,sort,slug) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)', ...v, uniqueSlug('products', name));
  return ok(`/painel/produtos/${Number(r.lastInsertRowid)}`, 'Produto criado.');
}
R('POST', /^\/painel\/produtos\/novo$/, ctx => saveProd(ctx, 0));
R('POST', /^\/painel\/produtos\/(\d+)$/, (ctx, [id]) => saveProd(ctx, Number(id)));
R('POST', /^\/painel\/produtos\/(\d+)\/excluir$/, (ctx, [id]) => { q.run('DELETE FROM products WHERE id=?', id); return ok('/painel/produtos', 'Produto excluído.'); });

// ---------- PORTFÓLIO ----------
R('GET', /^\/painel\/portfolio$/, ctx => {
  const rows = q.all('SELECT * FROM projects ORDER BY sort, id');
  return shell(ctx, 'Portfólio', html`<p><a class="btn sm" href="/painel/portfolio/novo">+ Novo projeto</a></p><table class="tbl"><tr><th></th><th>Ordem</th><th>Título</th><th>Ano</th><th>Categoria</th><th>Imagens</th><th>Home</th><th></th></tr>${rows.map(r => { const im = jparse(r.images); return html`<tr class="${r.published ? '' : 'off'}"><td>${im[0] ? html`<img class="tn" src="${im[0].thumb || im[0].web}" alt="">` : ''}</td><td>${r.sort}</td><td><a href="/painel/portfolio/${r.id}">${r.title}</a>${r.published ? '' : ' (rascunho)'}</td><td>${r.year}</td><td>${r.category}</td><td>${im.length}</td><td>${r.featured ? '★' : ''}</td><td><a href="/painel/portfolio/${r.id}">editar</a></td></tr>`; })}</table>`);
});
const projForm = (ctx, r, isNew) => shell(ctx, isNew ? 'Novo projeto' : r.title, html`<p><a href="/painel/portfolio">← Voltar</a> ${isNew ? '' : html`· <a href="/portfolio/${r.slug}" target="_blank">ver no site ↗</a>`}</p>
<form class="form wide" method="post" action="/painel/portfolio/${isNew ? 'novo' : r.id}" enctype="multipart/form-data">${csrf(ctx)}<div class="split"><div>${imgEditor(jparse(r.images))}${f('Vídeos (um link por linha: YouTube, Vimeo ou .mp4)', 'videos', r.videos, { type: 'textarea', rows: 3 })}</div><div>
${f('Título *', 'title', r.title, { req: 1 })}<div class="two">${f('Ano', 'year', r.year, { ph: '2025 ou 2023–2026' })}${sel('Categoria', 'category', cats('portfolio'), r.category, { blank: true })}</div>
${f('Técnica e materiais', 'techniques', r.techniques)}${f('Dimensões', 'dimensions', r.dimensions)}${f('Texto curatorial / descrição', 'summary', r.summary, { type: 'textarea', rows: 8, hint: 'Rascunho inicial — reescreva à vontade. Separe parágrafos com uma linha em branco.' })}${f('Contextualização conceitual', 'concept', r.concept, { type: 'textarea', rows: 6, hint: 'Aparece abaixo do texto curatorial, sob o título “Contexto conceitual”.' })}
<div class="two">${f('Botão: texto', 'link_label', r.link_label)}${f('Botão: link', 'link_url', r.link_url, { ph: '/flash ou https://…' })}</div><div class="two">${f('Ordem de exibição', 'sort', r.sort, { type: 'number', hint: 'Menor número aparece primeiro.' })}<div>${chk('Destacar na página inicial', 'featured', r.featured)}${chk('Publicado', 'published', r.published)}</div></div><button class="btn" type="submit">Salvar</button></div></div></form>
${isNew ? '' : html`<form method="post" action="/painel/portfolio/${r.id}/excluir" data-confirm="Excluir este projeto?">${csrf(ctx)}<button class="link danger">Excluir projeto</button></form>`}`);
R('GET', /^\/painel\/portfolio\/novo$/, ctx => projForm(ctx, { title: '', year: String(new Date().getFullYear()), category: '', techniques: '', dimensions: '', summary: '', concept: '', images: '[]', videos: '', link_label: '', link_url: '', featured: 0, published: 1, sort: q.get('SELECT COALESCE(MAX(sort),0)+1 n FROM projects').n }, true));
R('GET', /^\/painel\/portfolio\/(\d+)$/, (ctx, [id]) => { const r = q.get('SELECT * FROM projects WHERE id=?', id); return r ? projForm(ctx, r, false) : { status: 404, body: 'Não encontrado' }; });
async function saveProj(ctx, id) {
  const F = ctx.fields, title = L.clip(F.title, 160), back = id ? `/painel/portfolio/${id}` : '/painel/portfolio/novo'; if (!title) return ok(back, 'Informe o título.');
  let images; try { images = await collectImages(ctx); } catch (e) { return ok(back, e.message); }
  const lu = L.clip(F.link_url, 300); if (lu && !/^(\/|https?:\/\/)/.test(lu)) return ok(back, 'O link deve começar com / ou https://');
  const v = [title, L.clip(F.year, 20), L.clip(F.category, 80), L.clip(F.techniques, 300), L.clip(F.dimensions, 120), L.clip(F.summary, 5000), L.clip(F.concept, 5000), JSON.stringify(images), L.clip(F.videos, 2000), L.clip(F.link_label, 80), lu, F.featured ? 1 : 0, F.published ? 1 : 0, parseInt(F.sort) || 0];
  if (id) { q.run('UPDATE projects SET title=?,year=?,category=?,techniques=?,dimensions=?,summary=?,concept=?,images=?,videos=?,link_label=?,link_url=?,featured=?,published=?,sort=? WHERE id=?', ...v, id); return ok(`/painel/portfolio/${id}`, 'Projeto salvo.'); }
  const r = q.run('INSERT INTO projects(title,year,category,techniques,dimensions,summary,concept,images,videos,link_label,link_url,featured,published,sort,slug) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', ...v, uniqueSlug('projects', title));
  return ok(`/painel/portfolio/${Number(r.lastInsertRowid)}`, 'Projeto criado.');
}
R('POST', /^\/painel\/portfolio\/novo$/, ctx => saveProj(ctx, 0));
R('POST', /^\/painel\/portfolio\/(\d+)$/, (ctx, [id]) => saveProj(ctx, Number(id)));
R('POST', /^\/painel\/portfolio\/(\d+)\/excluir$/, (ctx, [id]) => { q.run('DELETE FROM projects WHERE id=?', id); return ok('/painel/portfolio', 'Projeto excluído.'); });

// ---------- CATEGORIAS ----------
R('GET', /^\/painel\/categorias$/, ctx => shell(ctx, 'Categorias', html`<div class="cards3">${[['portfolio', 'Portfólio'], ['produto', 'Catálogo'], ['flash', 'Flash tattoo']].map(([k, t]) => html`<div><h2>${t}</h2>${q.all('SELECT * FROM categories WHERE kind=? ORDER BY sort,name', k).map(c => html`<form class="inline" method="post" action="/painel/categorias/${c.id}">${csrf(ctx)}<input name="name" value="${c.name}"><input name="sort" type="number" value="${c.sort}" class="n"><button class="btn sm">Salvar</button><button class="link danger" name="del" value="1" data-confirm="Remover categoria? Itens já cadastrados mantêm o texto.">×</button></form>`)}
<form class="inline" method="post" action="/painel/categorias/novo">${csrf(ctx)}<input type="hidden" name="kind" value="${k}"><input name="name" placeholder="Nova categoria" required><button class="btn sm">Adicionar</button></form></div>`)}</div>`));
R('POST', /^\/painel\/categorias\/novo$/, ctx => { if (['portfolio', 'produto', 'flash'].includes(ctx.fields.kind) && L.clip(ctx.fields.name, 80)) q.run('INSERT OR IGNORE INTO categories(kind,name,sort) VALUES(?,?,99)', ctx.fields.kind, L.clip(ctx.fields.name, 80)); return ok('/painel/categorias', 'Categoria adicionada.'); });
R('POST', /^\/painel\/categorias\/(\d+)$/, (ctx, [id]) => { if (ctx.fields.del) q.run('DELETE FROM categories WHERE id=?', id); else q.run('UPDATE categories SET name=?, sort=? WHERE id=?', L.clip(ctx.fields.name, 80), parseInt(ctx.fields.sort) || 0, id); return ok('/painel/categorias', 'Atualizado.'); });

// ---------- CURRÍCULO ----------
R('GET', /^\/painel\/curriculo$/, ctx => {
  const rows = q.all('SELECT * FROM cv_items ORDER BY section,sort,id'), edit = ctx.query.edit ? q.get('SELECT * FROM cv_items WHERE id=?', ctx.query.edit) : null, e = edit || { section: 'exposicoes', title: '', institution: '', period: '', description: '', sort: 0 };
  return shell(ctx, 'Currículo', html`<p class="muted">As seções “Biografia” e “Contato profissional” vêm do texto “Sobre” e das Configurações. Use os campos abaixo para formação, cursos, projetos, exposições, residências, editais, publicações etc.</p>
<form class="form wide" method="post" action="/painel/curriculo/${edit ? edit.id : 'novo'}">${csrf(ctx)}<h2>${edit ? 'Editar item' : 'Novo item'}</h2><div class="two">${sel('Seção', 'section', Object.fromEntries(Object.entries(CV_SECTIONS).filter(([k]) => !['biografia', 'contato'].includes(k))), e.section)}${f('Período / ano', 'period', e.period)}</div>
<div class="two">${f('Título *', 'title', e.title, { req: 1 })}${f('Instituição / local', 'institution', e.institution)}</div>${f('Descrição', 'description', e.description, { type: 'textarea', rows: 3 })}${f('Ordem', 'sort', e.sort, { type: 'number' })}<button class="btn" type="submit">Salvar</button>${edit ? html` <a href="/painel/curriculo">cancelar</a>` : ''}</form>
<table class="tbl"><tr><th>Seção</th><th>Período</th><th>Título</th><th>Instituição</th><th></th></tr>${rows.map(r => html`<tr><td>${CV_SECTIONS[r.section] || r.section}</td><td>${r.period}</td><td>${r.title}</td><td>${r.institution}</td><td><a href="/painel/curriculo?edit=${r.id}">editar</a> <form class="inline" method="post" action="/painel/curriculo/${r.id}/excluir" data-confirm="Excluir item?">${csrf(ctx)}<button class="link danger">excluir</button></form></td></tr>`)}</table>`);
});
const saveCv = (ctx, id) => { const F = ctx.fields; if (!L.clip(F.title, 200) || !CV_SECTIONS[F.section]) return ok('/painel/curriculo', 'Dados inválidos.'); const v = [F.section, L.clip(F.title, 200), L.clip(F.institution, 200), L.clip(F.period, 60), L.clip(F.description, 1500), parseInt(F.sort) || 0]; if (id) q.run('UPDATE cv_items SET section=?,title=?,institution=?,period=?,description=?,sort=? WHERE id=?', ...v, id); else q.run('INSERT INTO cv_items(section,title,institution,period,description,sort) VALUES(?,?,?,?,?,?)', ...v); return ok('/painel/curriculo', 'Currículo atualizado.'); };
R('POST', /^\/painel\/curriculo\/novo$/, ctx => saveCv(ctx, 0));
R('POST', /^\/painel\/curriculo\/(\d+)$/, (ctx, [id]) => saveCv(ctx, Number(id)));
R('POST', /^\/painel\/curriculo\/(\d+)\/excluir$/, (ctx, [id]) => { q.run('DELETE FROM cv_items WHERE id=?', id); return ok('/painel/curriculo', 'Item excluído.'); });

// ---------- CONFIGURAÇÕES / CONTA ----------
const KEYS = ['site_title', 'tagline', 'instagram', 'email', 'whatsapp', 'site_url', 'about_text', 'booking_notice', 'order_notice', 'privacy_text'];
R('GET', /^\/painel\/config$/, ctx => { const S = D.allSettings(); return shell(ctx, 'Configurações', html`<form class="form wide" method="post" action="/painel/config" enctype="multipart/form-data">${csrf(ctx)}
<div class="two">${f('Nome do site', 'site_title', S.site_title)}${f('Endereço do site (URL)', 'site_url', S.site_url, { ph: 'https://www.seudominio.com.br', hint: 'Usado em sitemap, SEO e compartilhamento.' })}</div>${f('Frase de apresentação', 'tagline', S.tagline)}
<div class="two">${f('Instagram (link)', 'instagram', S.instagram)}${f('E-mail oficial', 'email', S.email, { type: 'email', hint: 'Aparece no site e recebe avisos (quando o envio de e-mail estiver configurado).' })}</div>
${f('WhatsApp (com DDI e DDD, só números)', 'whatsapp', S.whatsapp, { ph: '5511900000000' })}${f('Texto “Sobre” (separe parágrafos com linha em branco)', 'about_text', S.about_text, { type: 'textarea', rows: 12 })}
${f('Aviso do formulário de agendamento', 'booking_notice', S.booking_notice, { type: 'textarea', rows: 3 })}${f('Aviso do formulário de encomenda', 'order_notice', S.order_notice, { type: 'textarea', rows: 3 })}${f('Texto de privacidade', 'privacy_text', S.privacy_text, { type: 'textarea', rows: 6 })}
<fieldset><legend>Currículo em PDF</legend>${S.cv_pdf ? html`<p>Arquivo atual: <a href="${S.cv_pdf}" target="_blank">${S.cv_pdf}</a></p>${chk('Remover PDF', 'cv_pdf_del', false)}` : html`<p class="muted">Sem PDF enviado: o site oferece “imprimir/salvar como PDF” a partir da página do currículo.</p>`}<label>Enviar PDF<input type="file" name="cv_pdf" accept="application/pdf"></label></fieldset><button class="btn" type="submit">Salvar configurações</button></form>`); });
R('POST', /^\/painel\/config$/, ctx => {
  for (const k of KEYS) if (k in ctx.fields) { let v = L.clip(ctx.fields[k], 8000); if (k === 'whatsapp') v = v.replace(/\D/g, ''); if (k === 'instagram' && v && !/^https?:\/\//.test(v)) v = 'https://www.instagram.com/' + v.replace(/^@/, '') + '/'; if (k === 'email' && v && !L.validEmail(v)) return ok('/painel/config', 'E-mail inválido.'); setSetting(k, v); }
  const pdf = ctx.files.find(x => x.field === 'cv_pdf');
  if (pdf) { if (pdf.data.subarray(0, 5).toString() !== '%PDF-') return ok('/painel/config', 'O arquivo enviado não é um PDF.'); fs.mkdirSync(path.join(D.DATA, 'uploads', 'docs'), { recursive: true }); const fn = `curriculo-${Date.now()}.pdf`; fs.writeFileSync(path.join(D.DATA, 'uploads', 'docs', fn), pdf.data); setSetting('cv_pdf', `/uploads/docs/${fn}`); }
  else if (ctx.fields.cv_pdf_del) setSetting('cv_pdf', '');
  return ok('/painel/config', 'Configurações salvas.');
});
R('GET', /^\/painel\/conta$/, ctx => shell(ctx, 'Minha conta', html`<form class="form" method="post" action="/painel/conta">${csrf(ctx)}<p>Conectado como <strong>${ctx.session.email}</strong>.</p><label>Senha atual<input type="password" name="old" autocomplete="current-password" required></label><label>Nova senha (mín. 10 caracteres)<input type="password" name="new" autocomplete="new-password" minlength="10" required></label><button class="btn">Alterar senha</button></form>`));
R('POST', /^\/painel\/conta$/, ctx => {
  const u = q.get('SELECT * FROM users WHERE id=?', ctx.session.uid); if (!L.checkPw(String(ctx.fields.old || ''), u.pass_hash)) return ok('/painel/conta', 'Senha atual incorreta.');
  if (String(ctx.fields.new || '').length < 10) return ok('/painel/conta', 'A nova senha precisa ter ao menos 10 caracteres.');
  q.run('UPDATE users SET pass_hash=? WHERE id=?', L.hashPw(ctx.fields.new), u.id); q.run('DELETE FROM sessions WHERE user_id=? AND token<>?', u.id, ctx.session.token); return ok('/painel/conta', 'Senha alterada.');
});

module.exports = { routes };
