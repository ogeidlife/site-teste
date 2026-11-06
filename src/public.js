'use strict';
const { q, getSetting, allSettings, FLASH_STATUS, PRODUCT_STATUS, CV_SECTIONS } = require('./db');
const L = require('./lib');
const { html, raw, esc, brl, nl2p, jparse } = L;

// ---------- layout ----------
function layout(ctx, { title, desc, image, body, bodyClass = '', noindex = false }) {
  const S = ctx.settings, site = S.site_title || 'OGEID';
  const base = (S.site_url || '').replace(/\/$/, '');
  const full = title ? `${title} — ${site}` : `${site} — Artista visual independente`;
  const d = desc || S.tagline;
  const wa = S.whatsapp ? `https://wa.me/${S.whatsapp.replace(/\D/g, '')}` : '';
  const nav = [['/flash', 'Flash tattoo'], ['/catalogo', 'Catálogo'], ['/portfolio', 'Portfólio'], ['/sobre', 'Sobre'], ['/curriculo', 'Currículo'], ['/contato', 'Contato']];
  return html`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${full}</title><meta name="description" content="${d}">
${noindex ? raw('<meta name="robots" content="noindex">') : ''}
${base ? raw(`<link rel="canonical" href="${esc(base + ctx.url.pathname)}">`) : ''}
<meta property="og:title" content="${full}"><meta property="og:description" content="${d}"><meta property="og:type" content="website">
${image && base ? raw(`<meta property="og:image" content="${esc(base + image)}">`) : ''}
<link rel="icon" href="/media/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/style.css"></head>
<body class="${bodyClass}"><a class="skip" href="#main">Pular para o conteúdo</a>
<header class="top"><a class="logo" href="/" aria-label="OGEID — início">OGEID</a>
<button class="burger" aria-label="Abrir menu" aria-expanded="false" data-burger>Menu</button>
<nav class="nav" id="nav" aria-label="Principal">${nav.map(([h, t]) => html`<a href="${h}" ${ctx.url.pathname.startsWith(h) ? raw('aria-current="page"') : ''}>${t}</a>`)}
<a class="btn sm" href="/agendar">Agendar</a></nav></header>
<main id="main">${body}</main>
<footer class="foot"><div class="foot-big">OGEID</div>
<div class="foot-cols">
<div><h4>Navegar</h4>${nav.map(([h, t]) => html`<a href="${h}">${t}</a>`)}<a href="/agendar">Agendar tatuagem</a></div>
<div><h4>Contato</h4><a href="${S.instagram}" target="_blank" rel="noopener">Instagram @ogeid_life</a>
${S.email ? html`<a href="mailto:${S.email}">${S.email}</a>` : ''}${wa ? html`<a href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</div>
<div><h4>Informações</h4><a href="/privacidade">Privacidade e dados</a><a href="/sitemap.xml">Mapa do site</a></div>
</div><p class="copy">© ${new Date().getFullYear()} OGEID. Todos os direitos das obras reservados.</p></footer>
<div class="lightbox" id="lb" hidden role="dialog" aria-modal="true" aria-label="Imagem ampliada"><button class="lb-x" aria-label="Fechar">×</button><button class="lb-p" aria-label="Anterior">‹</button><img alt=""><button class="lb-n" aria-label="Próxima">›</button></div>
<script src="/js/site.js" defer></script></body></html>`;
}

// ---------- componentes ----------
const badge = (st, map = FLASH_STATUS) => html`<span class="badge s-${st}">${map[st] || st}</span>`;
const flashCard = f => html`<a class="fcard" href="/flash/${f.code.toLowerCase()}" data-code="${f.code}" data-title="${f.title}" data-cat="${f.category}" data-style="${f.style}" data-size="${f.size_label}" data-status="${f.status}" data-price="${f.price_cents ?? ''}"><div class="fimg"><img loading="lazy" decoding="async" src="${f.thumb || f.image}" alt="Flash tattoo ${f.title || f.code}"></div>
<div class="fmeta"><span class="code">${f.code}</span>${badge(f.status)}</div><div class="ftitle">${f.title || ''}</div>
<div class="fprice">${f.price_cents != null ? brl(f.price_cents) : ''}</div></a>`;
const gallery = (imgs, alt) => html`<div class="gallery">${imgs.map((i, n) => html`<a class="zoom" href="${i.web}" data-full="${i.web}"><img loading="${n ? 'lazy' : 'eager'}" decoding="async" src="${i.thumb || i.web}" alt="${alt}${imgs.length > 1 ? ' — imagem ' + (n + 1) : ''}"></a>`)}</div>`;
const num = n => String(n).padStart(2, '0');
function pager(ctx, total, per, page) {
  const pages = Math.ceil(total / per); if (pages <= 1) return '';
  const link = p => { const u = new URLSearchParams(ctx.url.searchParams); u.set('p', p); return '?' + u; };
  return html`<nav class="pager" aria-label="Paginação">${page > 1 ? html`<a href="${link(page - 1)}">← Anterior</a>` : ''}<span>${page} / ${pages}</span>${page < pages ? html`<a href="${link(page + 1)}">Próxima →</a>` : ''}</nav>`;
}

function embed(line) {
  line = line.trim(); if (!line) return '';
  let m;
  if ((m = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/.exec(line))) return html`<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" title="Vídeo" allowfullscreen loading="lazy"></iframe></div>`;
  if ((m = /vimeo\.com\/(\d+)/.exec(line))) return html`<div class="video"><iframe src="https://player.vimeo.com/video/${m[1]}" title="Vídeo" allowfullscreen loading="lazy"></iframe></div>`;
  if (/\.(mp4|webm)(\?|$)/i.test(line)) return html`<video controls preload="metadata" src="${line}"></video>`;
  return /^https?:\/\//.test(line) ? html`<p><a href="${line}" target="_blank" rel="noopener">${line}</a></p>` : '';
}

// ---------- páginas ----------
const routes = [];
const R = (method, re, fn) => routes.push({ method, re, fn });
const page = (ctx, o) => ({ body: layout(ctx, o) });
const notFound = ctx => ({ status: 404, body: layout(ctx, { title: 'Página não encontrada', noindex: true, body: html`<section class="wrap narrow"><p class="eyebrow">404</p><h1 class="display">Página não encontrada</h1><p><a class="btn" href="/">Voltar ao início</a></p></section>` }) });

R('GET', /^\/$/, ctx => {
  const S = ctx.settings;
  const featured = q.all('SELECT * FROM projects WHERE published=1 AND featured=1 ORDER BY sort, id LIMIT 6');
  const fl = q.all("SELECT * FROM flash WHERE published=1 AND status IN ('disponivel','exclusivo') ORDER BY sort DESC, id DESC LIMIT 12");
  const prods = q.all('SELECT * FROM products WHERE published=1 ORDER BY sort LIMIT 4');
  const heroImgs = featured.flatMap(p => jparse(p.images).slice(0, 1)).slice(0, 4);
  const projs = q.all('SELECT category,COUNT(*) c FROM projects WHERE published=1 GROUP BY category');
  return page(ctx, { body: html`
<section class="hero"><div class="hero-title"><p class="eyebrow">Artista visual independente · @ogeid_life</p><h1 class="mega">OGEID</h1>
<p class="lead">${S.tagline}</p><div class="row"><a class="btn" href="/agendar">Solicitar agendamento</a><a class="btn ghost" href="/portfolio">Ver portfólio</a></div></div>
<div class="hero-art" aria-hidden="true">${heroImgs.map((i, n) => html`<img class="h${n}" src="${i.web}" alt="" ${n ? raw('loading="lazy"') : ''}>`)}</div></section>
<section class="wrap intro"><p class="eyebrow">00 — Apresentação</p><p class="big">${S.about_text.split('\n\n')[0]}</p><p class="big dim">${S.about_text.split('\n\n')[2] || ''}</p><a class="link" href="/sobre">Sobre o artista →</a></section>
<section class="wrap"><div class="sec-head"><p class="eyebrow">01 — Flash tattoo</p><h2 class="display">Desenhos disponíveis</h2><a class="link" href="/flash">Ver todos →</a></div>
${fl.length ? html`<div class="fgrid">${fl.map(flashCard)}</div>` : html`<p class="muted">Novos flashes em breve.</p>`}</section>
<section class="wrap"><div class="sec-head"><p class="eyebrow">02 — Trabalhos recentes</p><h2 class="display">Seleção do portfólio</h2><a class="link" href="/portfolio">Portfólio completo →</a></div>
<div class="pgrid">${featured.map((p, n) => { const im = jparse(p.images)[0]; return html`<a class="pcard" href="/portfolio/${p.slug}"><div class="pimg">${im ? html`<img loading="lazy" src="${im.thumb || im.web}" alt="${p.title}">` : ''}</div><div class="pmeta"><span class="code">${num(n + 1)}</span><span>${p.category}</span><span>${p.year}</span></div><h3>${p.title}</h3></a>`; })}</div></section>
${prods.length ? html`<section class="wrap"><div class="sec-head"><p class="eyebrow">03 — Catálogo</p><h2 class="display">Obras e objetos</h2><a class="link" href="/catalogo">Ver catálogo →</a></div>
<div class="fgrid four">${prods.map(prodCard)}</div></section>` : ''}
<section class="wrap band"><p class="eyebrow">04 — Contato</p><h2 class="display">Vamos conversar.</h2>
<div class="row"><a class="btn" href="/agendar">Agendar tatuagem</a><a class="btn ghost" href="/contato">Contato profissional</a><a class="btn ghost" href="${S.instagram}" target="_blank" rel="noopener">Instagram</a></div></section>` });
});

function prodCard(p) {
  const im = jparse(p.images)[0]; const price = p.price_cents != null ? brl(p.price_cents) : 'Sob consulta';
  return html`<a class="fcard" href="/catalogo/${p.slug}"><div class="fimg">${im ? html`<img loading="lazy" decoding="async" src="${im.thumb || im.web}" alt="${p.name}">` : ''}</div>
<div class="fmeta"><span class="code">${p.code}</span>${badge(p.status, PRODUCT_STATUS)}</div><div class="ftitle">${p.name}</div><div class="fprice">${price}</div></a>`;
}

// ----- FLASH -----
R('GET', /^\/flash\/?$/, ctx => {
  const Q = ctx.query, where = ['published=1'], args = [];
  if (Q.q) { where.push('(code LIKE ? OR title LIKE ? OR description LIKE ?)'); args.push(...Array(3).fill(`%${Q.q}%`)); }
  for (const [k, col] of [['cat', 'category'], ['estilo', 'style'], ['tamanho', 'size_label'], ['status', 'status']]) if (Q[k]) { where.push(`${col}=?`); args.push(Q[k]); }
  const pmin = L.parseMoney(Q.pmin), pmax = L.parseMoney(Q.pmax);
  if (pmin != null) { where.push('price_cents>=?'); args.push(pmin); } if (pmax != null) { where.push('price_cents<=?'); args.push(pmax); }
  const W = where.join(' AND '), per = Q.all === '1' ? 100000 : 36, p = Math.max(1, parseInt(Q.p) || 1);
  const total = q.get(`SELECT COUNT(*) c FROM flash WHERE ${W}`, ...args).c;
  const rows = q.all(`SELECT * FROM flash WHERE ${W} ORDER BY sort DESC, id DESC LIMIT ? OFFSET ?`, ...args, per, (p - 1) * per);
  const opt = col => q.all(`SELECT DISTINCT ${col} v FROM flash WHERE published=1 AND ${col}<>'' ORDER BY ${col}`).map(r => r.v);
  const cats = opt('category'), styles = opt('style'), sizes = opt('size_label');
  const hasPrice = q.get('SELECT COUNT(*) c FROM flash WHERE published=1 AND price_cents IS NOT NULL').c > 0;
  const sel = (name, label, vals, map) => vals.length < 2 && !Q[name] ? '' : html`<label>${label}<select name="${name}"><option value="">Todos</option>${vals.map(v => html`<option value="${v}" ${Q[name] === v ? raw('selected') : ''}>${map ? map[v] : v}</option>`)}</select></label>`;
  return page(ctx, { title: 'Flash tattoo', desc: 'Catálogo de flash tattoos autorais disponíveis para agendamento.', body: html`
<section class="wrap"><p class="eyebrow">01 — Flash tattoo</p><h1 class="display">Flash tattoo</h1>
<p class="lead narrow">Desenhos autorais prontos para tatuar. Cada flash tem um código próprio e um status — escolha um e solicite o agendamento.</p>
<form class="filters" method="get" action="/flash"><label>Buscar<input type="search" name="q" value="${Q.q || ''}" placeholder="Código ou nome"></label>
${sel('cat', 'Categoria', cats)}${sel('estilo', 'Estilo', styles)}${sel('tamanho', 'Tamanho', sizes)}${sel('status', 'Disponibilidade', Object.keys(FLASH_STATUS), FLASH_STATUS)}
${hasPrice ? html`<label>Preço de<input name="pmin" inputmode="decimal" value="${Q.pmin || ''}" placeholder="R$"></label><label>até<input name="pmax" inputmode="decimal" value="${Q.pmax || ''}" placeholder="R$"></label>` : ''}
<div class="row"><button class="btn sm" type="submit">Filtrar</button><a class="link" href="/flash">Limpar</a></div></form>
<p class="muted count">${total} ${total === 1 ? 'desenho' : 'desenhos'}</p>
${rows.length ? html`<div class="fgrid">${rows.map(flashCard)}</div>` : html`<p class="muted">Nenhum flash encontrado com esses filtros.</p>`}
${pager(ctx, total, per, p)}</section>` });
});

R('GET', /^\/flash\/([\w-]+)$/, (ctx, [code]) => {
  const f = q.get('SELECT * FROM flash WHERE lower(code)=? AND published=1', code.toLowerCase()); if (!f) return notFound(ctx);
  const prev = q.get('SELECT code FROM flash WHERE published=1 AND (sort<? OR (sort=? AND id<?)) ORDER BY sort DESC, id DESC LIMIT 1', f.sort, f.sort, f.id);
  const next = q.get('SELECT code FROM flash WHERE published=1 AND (sort>? OR (sort=? AND id>?)) ORDER BY sort, id LIMIT 1', f.sort, f.sort, f.id);
  const rows = [['Código', f.code], ['Categoria', f.category], ['Estilo', f.style], ['Tamanho', f.size_label], ['Dimensões aproximadas', f.dimensions], ['Local sugerido', f.body_place], ['Ano', f.year]].filter(r => r[1]);
  const can = f.status !== 'tatuado';
  return page(ctx, { title: `Flash ${f.title || f.code}`, desc: f.description || `Flash tattoo ${f.code} — OGEID.`, image: f.image, body: html`
<section class="wrap detail"><div class="d-img"><a class="zoom" href="${f.image}" data-full="${f.image}"><img src="${f.image}" alt="Flash tattoo ${f.title || f.code}"></a></div>
<div class="d-info"><p class="eyebrow"><a href="/flash">← Flash tattoo</a></p><h1 class="display sm">${f.title || f.code}</h1>${badge(f.status)}
${f.description ? html`<div class="prose">${nl2p(f.description)}</div>` : ''}
<dl class="specs">${rows.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}<dt>Valor</dt><dd>${f.price_cents != null ? brl(f.price_cents) : 'A combinar com o artista'}</dd></dl>
${can ? html`<a class="btn" href="/agendar?flash=${f.code}">Solicitar agendamento</a>` : html`<p class="muted">Este desenho já foi tatuado e não está mais disponível.</p><a class="btn ghost" href="/flash">Ver outros flashes</a>`}
${f.status === 'reservado' ? html`<p class="muted">Reservado no momento — você pode entrar na fila solicitando o agendamento.</p>` : ''}
${f.status === 'exclusivo' ? html`<p class="muted">Desenho exclusivo: será tatuado em uma única pessoa.</p>` : ''}
<nav class="prevnext">${prev ? html`<a href="/flash/${prev.code.toLowerCase()}">← ${prev.code}</a>` : ''}${next ? html`<a href="/flash/${next.code.toLowerCase()}">${next.code} →</a>` : ''}</nav></div></section>` });
});

// ----- AGENDAMENTO -----
function bookingForm(ctx, v = {}, errs = {}) {
  const S = ctx.settings, flashList = q.all("SELECT code,title,status FROM flash WHERE published=1 AND status<>'tatuado' ORDER BY code");
  const err = k => errs[k] ? html`<span class="err" role="alert">${errs[k]}</span>` : '';
  return html`<form class="form" method="post" action="/agendar" enctype="multipart/form-data" novalidate>
<input type="hidden" name="_t" value="${L.formToken()}"><div class="hp" aria-hidden="true"><label>Não preencha<input name="website" tabindex="-1" autocomplete="off"></label></div>
${errs._ ? html`<p class="alert" role="alert">${errs._}</p>` : ''}
<fieldset><legend>Tatuagem</legend>
<label>Flash tattoo escolhido<input name="flash_code" list="flashes" value="${v.flash_code || ''}" placeholder="Digite ou cole o código, ex.: OG-F-0001" autocomplete="off">${err('flash_code')}</label>
<datalist id="flashes">${flashList.map(f => html`<option value="${f.code}">${f.title || ''}</option>`)}</datalist>
<label class="check"><input type="checkbox" name="custom" value="1" ${v.custom ? raw('checked') : ''}> Quero uma tatuagem personalizada (sem flash)</label>
<div class="two"><label>Tamanho desejado *<input name="size" value="${v.size || ''}" placeholder="ex.: 10 cm">${err('size')}</label><label>Região do corpo *<input name="body_place" value="${v.body_place || ''}" placeholder="ex.: antebraço">${err('body_place')}</label></div>
<label>Preferência de data<input name="date_pref" value="${v.date_pref || ''}" placeholder="ex.: fins de semana de dezembro">${err('date_pref')}</label>
<label>Descrição adicional<textarea name="description" rows="5" maxlength="2000" placeholder="Conte a ideia, adaptações, cobertura de tatuagem antiga etc.">${v.description || ''}</textarea>${err('description')}</label>
<label>Referências visuais (opcional, até 3 imagens de 5 MB)<input type="file" name="refs" accept="image/*" multiple>${err('refs')}</label></fieldset>
<fieldset><legend>Seus dados</legend><div class="two"><label>Nome *<input name="name" value="${v.name || ''}" autocomplete="name">${err('name')}</label><label>Instagram ou WhatsApp *<input name="contact" value="${v.contact || ''}" placeholder="@usuario ou (11) 90000-0000">${err('contact')}</label></div>
<label>E-mail *<input type="email" name="email" value="${v.email || ''}" autocomplete="email">${err('email')}</label></fieldset>
<label class="check"><input type="checkbox" name="consent" value="1" ${v.consent ? raw('checked') : ''}> Concordo com o uso dos meus dados para responder a esta solicitação, conforme a <a href="/privacidade" target="_blank">política de privacidade</a>. *</label>${err('consent')}
<button class="btn" type="submit">Enviar solicitação</button></form>`;
}
R('GET', /^\/agendar\/?$/, ctx => {
  const code = ctx.query.flash ? q.get('SELECT * FROM flash WHERE lower(code)=? AND published=1', ctx.query.flash.toLowerCase()) : null;
  return page(ctx, { title: 'Agendamento de tatuagem', desc: 'Solicite o agendamento de um flash tattoo ou de uma tatuagem personalizada.', body: html`
<section class="wrap split"><div><p class="eyebrow">03 — Agendamento</p><h1 class="display">Solicitar agendamento</h1>
<p class="lead">${ctx.settings.booking_notice}</p>
${code ? html`<div class="chosen"><img src="${code.thumb || code.image}" alt="Flash escolhido ${code.code}"><div><p class="code">${code.code}</p><p>${code.title || ''}</p>${badge(code.status)}</div></div>` : ''}</div>
<div>${bookingForm(ctx, { flash_code: code ? code.code : '' })}</div></section>` });
});
R('POST', /^\/agendar\/?$/, async ctx => {
  const F = ctx.fields, v = { ...F, custom: F.custom, consent: F.consent }, errs = {};
  const ip = L.ipHash(ctx.req);
  if (!L.rateLimit('book' + ip, 5, 600e3)) return { status: 429, body: layout(ctx, { title: 'Muitas tentativas', noindex: true, body: html`<section class="wrap narrow"><h1 class="display">Muitas tentativas</h1><p>Aguarde alguns minutos e tente novamente.</p></section>` }) };
  if (F.website) return { redirect: '/agendar/enviado' };               // honeypot: robôs recebem "sucesso" e nada é gravado
  if (!L.checkFormToken(F._t)) errs._ = 'Sessão do formulário expirada ou envio rápido demais. Recarregue a página e tente de novo.';
  const name = L.clip(F.name, 100), contact = L.clip(F.contact, 100), email = L.clip(F.email, 160), code = L.clip(F.flash_code, 40).toUpperCase();
  const custom = F.custom ? 1 : 0, size = L.clip(F.size, 60), place = L.clip(F.body_place, 80), date = L.clip(F.date_pref, 120), desc = L.clip(F.description, 2000);
  if (name.length < 2) errs.name = 'Informe seu nome.';
  if (!contact) errs.contact = 'Informe seu Instagram ou WhatsApp.';
  if (!L.validEmail(email)) errs.email = 'Informe um e-mail válido.';
  if (!size) errs.size = 'Informe o tamanho desejado.'; if (!place) errs.body_place = 'Informe a região do corpo.';
  if (!F.consent) errs.consent = 'É necessário concordar para enviar.';
  let fl = null;
  if (code) { fl = q.get('SELECT * FROM flash WHERE upper(code)=? AND published=1', code); if (!fl) errs.flash_code = 'Código não encontrado. Confira na página do desenho.'; else if (fl.status === 'tatuado') errs.flash_code = 'Este desenho já foi tatuado e não está disponível.'; }
  else if (!custom) errs.flash_code = 'Informe o código de um flash ou marque “tatuagem personalizada”.';
  if (custom && !fl && desc.length < 15) errs.description = 'Descreva a ideia da tatuagem personalizada.';
  const refs = [];
  const files = ctx.files.filter(f => f.field === 'refs').slice(0, 3);
  if (!errs._ && !Object.keys(errs).length) for (const f of files) { if (f.data.length > 5 * 1024 * 1024) { errs.refs = 'Cada imagem deve ter até 5 MB.'; break; } try { refs.push(await L.saveImage(f, 'refs')); } catch (e) { errs.refs = e.message; break; } }
  if (Object.keys(errs).length) return { status: 422, body: layout(ctx, { title: 'Agendamento de tatuagem', noindex: true, body: html`<section class="wrap split"><div><p class="eyebrow">03 — Agendamento</p><h1 class="display">Solicitar agendamento</h1><p class="lead">Revise os campos destacados.</p></div><div>${bookingForm(ctx, v, errs)}</div></section>` }) };
  const r = q.run('INSERT INTO bookings(name,contact,email,flash_code,custom,size,body_place,date_pref,description,refs,consent,ip_hash) VALUES(?,?,?,?,?,?,?,?,?,?,1,?)',
    name, contact, email, fl ? fl.code : '', custom, size, place, date, desc, JSON.stringify(refs.map(x => x.web)), ip);
  const id = Number(r.lastInsertRowid); L.notify('solicitação de agendamento', { id }, `${name} — ${fl ? fl.code : 'personalizada'}`);
  return { redirect: `/agendar/enviado?n=${id}&k=${hm(id)}` };
});
const hm = id => L.hmac('conf' + id);
R('GET', /^\/agendar\/enviado\/?$/, ctx => {
  const S = ctx.settings, id = Number(ctx.query.n), ok = id && ctx.query.k === hm(id);
  const b = ok ? q.get('SELECT * FROM bookings WHERE id=?', id) : null;
  const wa = S.whatsapp ? `https://wa.me/${S.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Enviei uma solicitação de agendamento pelo site${b && b.flash_code ? ` (flash ${b.flash_code})` : ''}${b ? `, em nome de ${b.name}` : ''}.`)}` : '';
  return page(ctx, { title: 'Solicitação enviada', noindex: true, body: html`<section class="wrap narrow"><p class="eyebrow">Solicitação recebida</p><h1 class="display">Recebido.</h1>
<p class="lead">Sua solicitação${b ? ` nº ${b.id}` : ''} foi enviada. Ainda <strong>não é uma reserva</strong>: o artista vai analisar e confirmar disponibilidade, valor e data pelo contato que você informou.</p>
${b ? html`<dl class="specs"><dt>Flash</dt><dd>${b.flash_code || 'Tatuagem personalizada'}</dd><dt>Tamanho</dt><dd>${b.size}</dd><dt>Região</dt><dd>${b.body_place}</dd></dl>` : ''}
<p>Para agilizar, continue a conversa:</p><div class="row">${wa ? html`<a class="btn" href="${wa}" target="_blank" rel="noopener">Continuar no WhatsApp</a>` : ''}<a class="btn ${wa ? 'ghost' : ''}" href="${S.instagram}" target="_blank" rel="noopener">Falar no Instagram</a><a class="btn ghost" href="/flash">Ver mais flashes</a></div></section>` });
});

// ----- CATÁLOGO -----
R('GET', /^\/catalogo\/?$/, ctx => {
  const cat = ctx.query.cat || '', args = [];
  let W = 'published=1'; if (cat) { W += ' AND category=?'; args.push(cat); }
  const rows = q.all(`SELECT * FROM products WHERE ${W} ORDER BY sort, id`, ...args);
  const cats = q.all("SELECT name FROM categories WHERE kind='produto' ORDER BY sort,name").map(r => r.name).filter(n => q.get('SELECT 1 x FROM products WHERE published=1 AND category=?', n));
  return page(ctx, { title: 'Catálogo', desc: 'Prints, pinturas originais, vestuário, colecionáveis e objetos de OGEID.', body: html`
<section class="wrap"><p class="eyebrow">04 — Catálogo</p><h1 class="display">Catálogo</h1>
<p class="lead narrow">Obras e objetos disponíveis para aquisição ou encomenda. ${ctx.settings.order_notice}</p>
<nav class="tabs" aria-label="Categorias"><a href="/catalogo" ${!cat ? raw('aria-current="true"') : ''}>Tudo</a>${cats.map(c => html`<a href="/catalogo?cat=${c}" ${cat === c ? raw('aria-current="true"') : ''}>${c}</a>`)}</nav>
${rows.length ? html`<div class="fgrid four">${rows.map(prodCard)}</div>` : html`<p class="muted">Nenhum produto nesta categoria no momento.</p>`}</section>` });
});
function orderForm(ctx, p, v = {}, errs = {}) {
  const err = k => errs[k] ? html`<span class="err" role="alert">${errs[k]}</span>` : '';
  return html`<form class="form" id="encomenda" method="post" action="/encomenda" novalidate><input type="hidden" name="_t" value="${L.formToken()}"><input type="hidden" name="product" value="${p.code}">
<div class="hp" aria-hidden="true"><label>Não preencha<input name="website" tabindex="-1" autocomplete="off"></label></div>${errs._ ? html`<p class="alert" role="alert">${errs._}</p>` : ''}
<h3>Solicitar encomenda</h3><div class="two"><label>Quantidade *<input type="number" name="qty" min="1" max="99" value="${v.qty || 1}">${err('qty')}</label><label>Nome *<input name="name" value="${v.name || ''}" autocomplete="name">${err('name')}</label></div>
<div class="two"><label>Instagram ou WhatsApp *<input name="contact" value="${v.contact || ''}">${err('contact')}</label><label>E-mail *<input type="email" name="email" value="${v.email || ''}">${err('email')}</label></div>
<label>Personalização<textarea name="customization" rows="3" maxlength="1000" placeholder="Cor, tamanho, nome, adaptações…">${v.customization || ''}</textarea></label>
<label>Observações<textarea name="notes" rows="3" maxlength="1500">${v.notes || ''}</textarea></label>
<label class="check"><input type="checkbox" name="consent" value="1" ${v.consent ? raw('checked') : ''}> Concordo com o uso dos meus dados para responder a esta solicitação (<a href="/privacidade" target="_blank">privacidade</a>). *</label>${err('consent')}
<p class="muted small">${ctx.settings.order_notice} Nenhum pagamento é feito neste formulário.</p><button class="btn" type="submit">Enviar solicitação</button></form>`;
}
const productPage = (ctx, p, v, errs, status = 200) => {
  const imgs = jparse(p.images), rows = [['Código', p.code], ['Categoria', p.category], ['Dimensões', p.dimensions], ['Materiais', p.materials], ['Estoque', p.stock != null ? `${p.stock} un.` : '']].filter(r => r[1]);
  return { status, body: layout(ctx, { title: p.name, desc: p.description || `${p.name} — catálogo OGEID.`, image: imgs[0]?.web, body: html`
<section class="wrap detail prod"><div class="d-img">${gallery(imgs, p.name)}</div><div class="d-info"><p class="eyebrow"><a href="/catalogo">← Catálogo</a></p><h1 class="display sm">${p.name}</h1>${badge(p.status, PRODUCT_STATUS)}
<p class="price">${p.price_cents != null ? brl(p.price_cents) : 'Preço sob consulta'}</p>${p.description ? html`<div class="prose">${nl2p(p.description)}</div>` : ''}
<dl class="specs">${rows.map(([k, x]) => html`<dt>${k}</dt><dd>${x}</dd>`)}</dl>
${p.status === 'esgotado' ? html`<p class="muted">Esgotado no momento. Entre em contato para saber sobre reposição.</p><a class="btn ghost" href="/contato">Contato</a>` : orderForm(ctx, p, v, errs)}</div></section>` }) };
};
R('GET', /^\/catalogo\/([\w-]+)$/, (ctx, [slug]) => { const p = q.get('SELECT * FROM products WHERE slug=? AND published=1', slug); return p ? productPage(ctx, p, {}, {}) : notFound(ctx); });
R('POST', /^\/encomenda\/?$/, ctx => {
  const F = ctx.fields, p = q.get('SELECT * FROM products WHERE code=? AND published=1', F.product || ''); if (!p) return notFound(ctx);
  const ip = L.ipHash(ctx.req); if (!L.rateLimit('ord' + ip, 5, 600e3)) return { status: 429, body: 'Muitas tentativas. Aguarde alguns minutos.' };
  if (F.website) return { redirect: '/encomenda/enviada' };
  const errs = {}; if (!L.checkFormToken(F._t)) errs._ = 'Sessão do formulário expirada ou envio rápido demais. Tente novamente.';
  const name = L.clip(F.name, 100), contact = L.clip(F.contact, 100), email = L.clip(F.email, 160), qty = parseInt(F.qty);
  if (name.length < 2) errs.name = 'Informe seu nome.'; if (!contact) errs.contact = 'Informe seu contato.'; if (!L.validEmail(email)) errs.email = 'E-mail inválido.';
  if (!(qty >= 1 && qty <= 99)) errs.qty = 'Quantidade inválida.'; else if (p.stock != null && qty > p.stock && p.status !== 'encomenda') errs.qty = `Estoque disponível: ${p.stock}.`;
  if (!F.consent) errs.consent = 'É necessário concordar para enviar.';
  if (Object.keys(errs).length) return productPage(ctx, p, F, errs, 422);
  const r = q.run('INSERT INTO orders(product_code,product_name,qty,customization,notes,name,contact,email,consent,ip_hash) VALUES(?,?,?,?,?,?,?,?,1,?)', p.code, p.name, qty, L.clip(F.customization, 1000), L.clip(F.notes, 1500), name, contact, email, ip);
  L.notify('encomenda', { id: Number(r.lastInsertRowid) }, `${name} — ${p.name}`);
  return { redirect: `/encomenda/enviada?p=${p.slug}` };
});
R('GET', /^\/encomenda\/enviada\/?$/, ctx => {
  const S = ctx.settings, p = q.get('SELECT * FROM products WHERE slug=?', ctx.query.p || '');
  const wa = S.whatsapp ? `https://wa.me/${S.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Enviei uma solicitação de encomenda pelo site' + (p ? ` (${p.name})` : '') + '.')}` : '';
  return page(ctx, { title: 'Encomenda enviada', noindex: true, body: html`<section class="wrap narrow"><p class="eyebrow">Solicitação recebida</p><h1 class="display">Recebido.</h1><p class="lead">Sua solicitação de encomenda foi enviada. O artista responderá com valores, prazo e forma de pagamento. Nenhum pagamento foi realizado.</p>
<div class="row">${wa ? html`<a class="btn" href="${wa}" target="_blank" rel="noopener">Continuar no WhatsApp</a>` : ''}<a class="btn ghost" href="${S.instagram}" target="_blank" rel="noopener">Instagram</a><a class="btn ghost" href="/catalogo">Voltar ao catálogo</a></div></section>` });
});

// ----- PORTFÓLIO -----
R('GET', /^\/portfolio\/?$/, ctx => {
  const cat = ctx.query.cat || '', args = []; let W = 'published=1'; if (cat) { W += ' AND category=?'; args.push(cat); }
  const rows = q.all(`SELECT * FROM projects WHERE ${W} ORDER BY sort, id`, ...args);
  const cats = q.all("SELECT name FROM categories WHERE kind='portfolio' ORDER BY sort,name").map(r => r.name).filter(n => q.get('SELECT 1 x FROM projects WHERE published=1 AND category=?', n));
  return page(ctx, { title: 'Portfólio artístico', desc: 'Projetos, séries e linguagens: pintura, desenho, tattoo, escultura, design e vestuário.', body: html`
<section class="wrap"><p class="eyebrow">05 — Portfólio artístico</p><h1 class="display">Portfólio</h1>
<nav class="tabs" aria-label="Categorias"><a href="/portfolio" ${!cat ? raw('aria-current="true"') : ''}>Tudo</a>${cats.map(c => html`<a href="/portfolio?cat=${c}" ${cat === c ? raw('aria-current="true"') : ''}>${c}</a>`)}</nav>
<div class="pgrid">${rows.map((p, n) => { const im = jparse(p.images)[0]; return html`<a class="pcard" href="/portfolio/${p.slug}"><div class="pimg">${im ? html`<img loading="lazy" src="${im.thumb || im.web}" alt="${p.title}">` : ''}</div><div class="pmeta"><span class="code">${num(n + 1)}</span><span>${p.category}</span><span>${p.year}</span></div><h3>${p.title}</h3></a>`; })}</div>
${rows.length ? '' : html`<p class="muted">Nenhum projeto nesta categoria.</p>`}</section>` });
});
R('GET', /^\/portfolio\/([\w-]+)$/, (ctx, [slug]) => {
  const p = q.get('SELECT * FROM projects WHERE slug=? AND published=1', slug); if (!p) return notFound(ctx);
  const imgs = jparse(p.images), all = q.all('SELECT slug,title FROM projects WHERE published=1 ORDER BY sort,id'), i = all.findIndex(x => x.slug === slug);
  const prev = all[i - 1], next = all[i + 1];
  const rows = [['Ano', p.year], ['Categoria', p.category], ['Técnica e materiais', p.techniques], ['Dimensões', p.dimensions]].filter(r => r[1]);
  return page(ctx, { title: p.title, desc: p.summary, image: imgs[0]?.web, body: html`
<section class="wrap"><p class="eyebrow"><a href="/portfolio">← Portfólio</a> · ${num(i + 1)}/${num(all.length)}</p><h1 class="display">${p.title}</h1>
<div class="proj-text"><dl class="specs">${rows.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl><div class="prose">${nl2p(p.summary)}${p.concept ? html`<h3>Contexto conceitual</h3>${nl2p(p.concept)}` : ''}${p.link_url ? html`<p><a class="btn sm" href="${p.link_url}">${p.link_label || 'Saiba mais'}</a></p>` : ''}</div></div>
${(p.videos || '').split('\n').map(embed)}${gallery(imgs, p.title)}
<nav class="prevnext">${prev ? html`<a href="/portfolio/${prev.slug}">← ${prev.title}</a>` : '<span></span>'}${next ? html`<a href="/portfolio/${next.slug}">${next.title} →</a>` : ''}</nav></section>` });
});

// ----- SOBRE / CURRÍCULO / CONTATO / PRIVACIDADE -----
R('GET', /^\/sobre\/?$/, ctx => {
  const S = ctx.settings, imgs = q.all('SELECT images FROM projects WHERE published=1 AND featured=1 ORDER BY sort LIMIT 3').flatMap(r => jparse(r.images).slice(0, 1));
  return page(ctx, { title: 'Sobre o artista', desc: S.about_text.split('\n\n')[0], body: html`
<section class="wrap split about"><div><p class="eyebrow">06 — Sobre</p><h1 class="display">OGEID</h1><div class="prose big">${nl2p(S.about_text)}</div>
<div class="row"><a class="btn" href="/curriculo">Currículo artístico</a><a class="btn ghost" href="/contato">Contato</a></div></div><div class="stack">${imgs.map(i => html`<img loading="lazy" src="${i.web}" alt="">`)}</div></section>` });
});
R('GET', /^\/curriculo\/?$/, ctx => {
  const S = ctx.settings, items = q.all('SELECT * FROM cv_items ORDER BY sort,id');
  const sec = Object.entries(CV_SECTIONS).map(([k, label]) => {
    const rows = items.filter(i => i.section === k);
    if (k === 'biografia') return html`<section class="cv-sec"><h2>${label}</h2><div class="prose">${nl2p(S.about_text.split('\n\n').slice(0, 2).join('\n\n'))}</div></section>`;
    if (k === 'contato') return html`<section class="cv-sec"><h2>${label}</h2><div class="prose"><p>Instagram: <a href="${S.instagram}">@ogeid_life</a>${S.email ? html`<br>E-mail: <a href="mailto:${S.email}">${S.email}</a>` : ''}</p></div></section>`;
    return html`<section class="cv-sec"><h2>${label}</h2>${rows.length ? rows.map(r => html`<div class="cv-row"><span class="period">${r.period}</span><div><strong>${r.title}</strong>${r.institution ? html` — ${r.institution}` : ''}${r.description ? html`<p>${r.description}</p>` : ''}</div></div>`) : html`<p class="muted">Em atualização.</p>`}</section>`;
  });
  return page(ctx, { title: 'Currículo artístico', desc: 'Formação, pesquisa, linguagens, projetos e participações de OGEID.', bodyClass: 'cv', body: html`
<section class="wrap narrow"><p class="eyebrow">07 — Currículo artístico</p><h1 class="display">Currículo</h1>
<div class="row noprint">${S.cv_pdf ? html`<a class="btn" href="${S.cv_pdf}" download>Baixar PDF</a><a class="btn ghost" href="${S.cv_pdf}" target="_blank" rel="noopener">Visualizar PDF</a>` : html`<button class="btn" data-print>Baixar / imprimir em PDF</button>`}</div>${sec}</section>` });
});
function contactForm(ctx, v = {}, errs = {}) {
  const err = k => errs[k] ? html`<span class="err" role="alert">${errs[k]}</span>` : '';
  return html`<form class="form" method="post" action="/contato" novalidate><input type="hidden" name="_t" value="${L.formToken()}"><div class="hp" aria-hidden="true"><label>Não preencha<input name="website" tabindex="-1" autocomplete="off"></label></div>
${errs._ ? html`<p class="alert" role="alert">${errs._}</p>` : ''}<div class="two"><label>Nome *<input name="name" value="${v.name || ''}">${err('name')}</label><label>E-mail *<input type="email" name="email" value="${v.email || ''}">${err('email')}</label></div>
<label>Mensagem *<textarea name="message" rows="6" maxlength="3000">${v.message || ''}</textarea>${err('message')}</label>
<label class="check"><input type="checkbox" name="consent" value="1" ${v.consent ? raw('checked') : ''}> Concordo com o uso dos meus dados para responder a esta mensagem (<a href="/privacidade" target="_blank">privacidade</a>). *</label>${err('consent')}<button class="btn" type="submit">Enviar mensagem</button></form>`;
}
R('GET', /^\/contato\/?$/, ctx => {
  const S = ctx.settings, wa = S.whatsapp ? `https://wa.me/${S.whatsapp.replace(/\D/g, '')}` : '', sent = ctx.query.ok;
  return page(ctx, { title: 'Contato', desc: 'Contato profissional, Instagram e WhatsApp de OGEID.', body: html`<section class="wrap split"><div><p class="eyebrow">08 — Contato</p><h1 class="display">Contato</h1><p class="lead">Propostas, exposições, parcerias, encomendas e dúvidas.</p>
<div class="links"><a class="btn" href="${S.instagram}" target="_blank" rel="noopener">Instagram @ogeid_life</a>${S.email ? html`<a class="btn ghost" href="mailto:${S.email}">${S.email}</a>` : ''}${wa ? html`<a class="btn ghost" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}<a class="btn ghost" href="/agendar">Agendar tatuagem</a></div></div>
<div>${sent ? html`<p class="alert ok" role="status">Mensagem enviada. Obrigado — o retorno será feito pelo e-mail informado.</p>` : contactForm(ctx)}</div></section>` });
});
R('POST', /^\/contato\/?$/, ctx => {
  const F = ctx.fields, ip = L.ipHash(ctx.req); if (!L.rateLimit('ct' + ip, 4, 600e3)) return { status: 429, body: 'Muitas tentativas. Aguarde alguns minutos.' };
  if (F.website) return { redirect: '/contato?ok=1' };
  const errs = {}; if (!L.checkFormToken(F._t)) errs._ = 'Sessão do formulário expirada ou envio rápido demais. Tente novamente.';
  const name = L.clip(F.name, 100), email = L.clip(F.email, 160), msg = L.clip(F.message, 3000);
  if (name.length < 2) errs.name = 'Informe seu nome.'; if (!L.validEmail(email)) errs.email = 'E-mail inválido.'; if (msg.length < 5) errs.message = 'Escreva sua mensagem.'; if (!F.consent) errs.consent = 'É necessário concordar para enviar.';
  if (Object.keys(errs).length) return { status: 422, body: layout(ctx, { title: 'Contato', noindex: true, body: html`<section class="wrap split"><div><p class="eyebrow">08 — Contato</p><h1 class="display">Contato</h1></div><div>${contactForm(ctx, F, errs)}</div></section>` }) };
  const r = q.run('INSERT INTO contacts(name,email,message,consent,ip_hash) VALUES(?,?,?,1,?)', name, email, msg, ip);
  L.notify('mensagem de contato', { id: Number(r.lastInsertRowid) }, name);
  return { redirect: '/contato?ok=1' };
});
R('GET', /^\/privacidade\/?$/, ctx => page(ctx, { title: 'Privacidade e dados', body: html`<section class="wrap narrow"><p class="eyebrow">Informações</p><h1 class="display">Privacidade</h1><div class="prose">${nl2p(ctx.settings.privacy_text)}
<p>Os endereços de IP não são guardados: apenas um código irreversível, usado para limitar envios abusivos. Os dados ficam em banco de dados protegido, acessível somente ao artista.</p></div></section>` }));

R('GET', /^\/sitemap\.xml$/, ctx => {
  const base = (ctx.settings.site_url || `http://${ctx.req.headers.host}`).replace(/\/$/, '');
  const urls = ['/', '/flash', '/agendar', '/catalogo', '/portfolio', '/sobre', '/curriculo', '/contato', '/privacidade',
    ...q.all('SELECT code FROM flash WHERE published=1').map(r => '/flash/' + r.code.toLowerCase()), ...q.all('SELECT slug FROM products WHERE published=1').map(r => '/catalogo/' + r.slug), ...q.all('SELECT slug FROM projects WHERE published=1').map(r => '/portfolio/' + r.slug)];
  return { type: 'application/xml; charset=utf-8', body: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${esc(base + u)}</loc></url>`).join('')}</urlset>` };
});
R('GET', /^\/robots\.txt$/, ctx => ({ type: 'text/plain', body: `User-agent: *\nDisallow: /painel\nSitemap: ${(ctx.settings.site_url || `http://${ctx.req.headers.host}`).replace(/\/$/, '')}/sitemap.xml\n` }));

module.exports = { routes, layout, notFound, badge, num };
