'use strict';
// Todas as páginas públicas saem daqui: cabeçalho, rodapé e formulários são escritos UMA vez.
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paras = t => String(t || '').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean).map(x => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join('');
const FLASH_ST = { disponivel: 'Disponível', reservado: 'Reservado', tatuado: 'Já tatuado', exclusivo: 'Exclusivo' };
const PROD_ST = { disponivel: 'Disponível', sob_consulta: 'Sob consulta', encomenda: 'Sob encomenda', esgotado: 'Esgotado' };
const uniq = a => [...new Set(a.filter(Boolean))];

module.exports = function (getContent, media) {
  const img = (r, s) => media.url(r, s);
  const first = it => (it.images || []).filter(media.has)[0];
  const ig = c => c.settings.instagram || 'https://www.instagram.com/' + (c.settings.handle || '');
  const waNum = c => String(c.settings.whatsapp || '').replace(/\D/g, '');

  function layout(c, o) {
    const s = c.settings, title = o.title ? `${o.title} — ${s.name}` : s.title;
    const desc = o.desc || s.description, cur = o.active || '';
    const nav = (s.nav || []).filter(n => n.show).map(n => `<a href="/${n.key}"${cur === n.key ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`).join('');
    const og = o.image ? `<meta property="og:image" content="${esc(o.image)}">` : '';
    const wa = waNum(c);
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website">${og}
<link rel="icon" href="/media/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/css/style.css"></head>
<body><a class="skip" href="#main">Pular para o conteúdo</a>
<header class="top"><a class="logo" href="/" aria-label="${esc(s.name)} — início">${esc(s.name)}</a>
<button class="burger" aria-label="Abrir menu" aria-expanded="false" data-burger>Menu</button>
<nav class="nav" id="nav" aria-label="Principal">${nav}<a class="btn sm" href="/contato?tipo=tattoo" data-ev="cta_topo">Agendar</a></nav></header>
<main id="main">${o.body}</main>
<footer class="foot"><div class="foot-big" aria-hidden="true">${esc(s.name)}</div><div class="foot-cols">
<div><h4>Navegar</h4>${(s.nav || []).filter(n => n.show).map(n => `<a href="/${n.key}">${esc(n.label)}</a>`).join('')}<a href="/contato?tipo=tattoo">Agendar tatuagem</a></div>
<div><h4>Contato</h4>${wa ? `<a href="https://wa.me/${wa}" target="_blank" rel="noopener" data-ev="whatsapp">WhatsApp</a>` : ''}<a href="${esc(ig(c))}" target="_blank" rel="noopener" data-ev="instagram">Instagram @${esc(s.handle)}</a>${s.email ? `<a href="mailto:${esc(s.email)}" data-ev="email">${esc(s.email)}</a>` : ''}</div>
<div><h4>Informações</h4><a href="/privacidade">Privacidade e dados</a></div></div>
<p class="copy">${esc(s.footerNote)}</p></footer>
${o.noFab ? '' : '<a class="fab" href="/contato" data-ev="cta_fab">Agendar / Encomendar</a>'}
<div class="lightbox" id="lb" hidden role="dialog" aria-modal="true" aria-label="Imagem ampliada"><button class="lb-x" aria-label="Fechar">×</button><button class="lb-p" aria-label="Anterior">‹</button><img alt=""><button class="lb-n" aria-label="Próxima">›</button></div>
<script src="/js/site.js" defer></script></body></html>`;
  }

  // ---------- cartões
  const flashCard = f => `<a class="fcard" href="/flash/${f.code.toLowerCase()}" data-c="${esc(f.code)}" data-k="${esc(f.cat)}" data-s="${esc(f.status)}">
<div class="fimg"><img loading="lazy" decoding="async" src="${img(f.img, 'thumb')}" alt="Flash tattoo ${esc(f.code)}"></div>
<div class="fmeta"><span class="code">${esc(f.code)}</span>${f.status !== 'disponivel' ? `<span class="badge s-${esc(f.status)}">${FLASH_ST[f.status] || esc(f.status)}</span>` : ''}</div>${f.title ? `<div class="ftitle">${esc(f.title)}</div>` : ''}${f.price ? `<div class="fprice">${esc(f.price)}</div>` : ''}</a>`;
  const prodCard = p => `<a class="fcard" href="/catalogo/${esc(p.slug)}"><div class="fimg">${first(p) ? `<img loading="lazy" decoding="async" src="${img(first(p), 'thumb')}" alt="${esc(p.title)}">` : ''}</div>
<div class="fmeta"><span class="ftitle">${esc(p.title)}</span>${['esgotado', 'encomenda'].includes(p.status) ? `<span class="badge s-${p.status}">${PROD_ST[p.status]}</span>` : ''}</div><div class="fprice">${esc(p.price || 'Sob consulta')}</div></a>`;
  const projCard = p => `<a class="pcard" href="/portfolio/${esc(p.slug)}"><div class="pimg">${first(p) ? `<img loading="lazy" src="${img(first(p), 'thumb')}" alt="${esc(p.title)}">` : ''}</div>
<div class="pmeta"><span>${esc(p.cat)}</span><span>${esc(p.year)}</span></div><h3>${esc(p.title)}</h3></a>`;
  const tabs = (base, cats, cur) => `<nav class="tabs" aria-label="Categorias"><a href="${base}"${!cur ? ' aria-current="true"' : ''}>Tudo</a>${cats.map(k => `<a href="${base}?cat=${encodeURIComponent(k)}"${cur === k ? ' aria-current="true"' : ''}>${esc(k)}</a>`).join('')}</nav>`;
  const contacts = (c, cls = '') => { const wa = waNum(c), s = c.settings; return `<div class="row ${cls}">${wa ? `<a class="btn" href="https://wa.me/${wa}" target="_blank" rel="noopener" data-ev="whatsapp">WhatsApp</a>` : ''}<a class="btn${wa ? ' ghost' : ''}" href="${esc(ig(c))}" target="_blank" rel="noopener" data-ev="instagram">Instagram @${esc(s.handle)}</a>${s.email ? `<a class="btn ghost" href="mailto:${esc(s.email)}" data-ev="email">E-mail</a>` : ''}</div>`; };

  // ---------- formulário único (usado em contato, flash e catálogo)
  function form(c, o) {
    const t = o.type || 'tattoo', all = !o.type, prods = c.products;
    const type = all ? `<fieldset class="types"><legend>O que você quer?</legend>
<label class="check"><input type="radio" name="tipo" value="tattoo"${t === 'tattoo' ? ' checked' : ''}> Agendar uma tatuagem</label>
<label class="check"><input type="radio" name="tipo" value="produto"${t === 'produto' ? ' checked' : ''}> Comprar ou encomendar uma obra / objeto</label>
<label class="check"><input type="radio" name="tipo" value="outro"${t === 'outro' ? ' checked' : ''}> Outro assunto (proposta, exposição, parceria…)</label></fieldset>` : `<input type="hidden" name="tipo" value="${t}">`;
    const refField = o.ref ? `<input type="hidden" name="ref" value="${esc(o.ref)}">` : `
<label data-for="tattoo">Flash escolhido<input name="ref_tattoo" value="${esc(o.refValue || '')}" placeholder="Código (ex.: OG-F-0273) ou “desenho personalizado”"></label>
<label data-for="produto">Obra ou objeto<input name="ref_produto" list="prods" value="${esc(o.refValue || '')}" placeholder="Qual item do catálogo?"><datalist id="prods">${prods.map(p => `<option value="${esc(p.title)}">`).join('')}</datalist></label>`;
    return `<form class="form order" method="post" action="/api/pedido" data-order data-type="${all ? '' : t}">
${type}${refField}
<div class="two"><label>Seu nome<input name="nome" required autocomplete="name"></label>
<label>WhatsApp, Instagram ou e-mail<input name="contato" required placeholder="Como posso te responder?"></label></div>
<div class="two" data-for="tattoo"><label>Região do corpo<input name="regiao" placeholder="Ex.: antebraço"></label><label>Tamanho aproximado<input name="tamanho" placeholder="Ex.: 10 cm"></label></div>
<label data-for="tattoo">Quando você prefere?<input name="quando" placeholder="Dia, período ou “sem pressa”"></label>
<label data-for="produto">Quantidade<input name="quantidade" type="number" min="1" value="1"></label>
<label>Mensagem <small>(opcional)</small><textarea name="mensagem" rows="3" placeholder="Referências, personalização, dúvidas…"></textarea></label>
<input class="hp" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">
<button class="btn" type="submit">${esc(o.button || 'Enviar solicitação')}</button>
<p class="muted small">${esc(c.settings.orderNote)}</p>
<div class="alert ok" data-done hidden role="status"><strong>Pedido recebido!</strong> O artista vai te responder em breve.<span data-follow></span></div>
<div class="alert" data-fail hidden role="alert">Não foi possível enviar. Tente novamente ou fale pelo Instagram.</div></form>`;
  }

  // ---------- páginas
  const P = {};
  P.home = (c) => {
    const s = c.settings, flash = c.flash.filter(f => f.status === 'disponivel').slice(0, 12);
    const fp = c.products.filter(p => p.featured).slice(0, 4), fj = c.projects.filter(p => p.featured).slice(0, 5);
    const hi = (s.heroImages || []).filter(media.has);
    return layout(c, {
      image: hi[0] && img(hi[0], 'web'), body: `
<section class="hero"><div class="hero-title"><p class="eyebrow">Artista visual independente · @${esc(s.handle)}</p><h1 class="mega">${esc(s.name)}</h1>
<p class="lead">${esc(s.tagline)}</p><div class="row"><a class="btn" href="/contato?tipo=tattoo" data-ev="cta_hero_agendar">Agendar tatuagem</a><a class="btn ghost" href="/catalogo">Comprar / encomendar</a><a class="btn ghost" href="/portfolio">Ver portfólio</a></div></div>
<div class="hero-art" aria-hidden="true">${hi.map((r, i) => `<img class="h${i}" src="${img(r, i ? 'thumb' : 'web')}" alt=""${i ? ' loading="lazy"' : ''}>`).join('')}</div></section>
<section class="wrap steps"><p class="eyebrow">Como funciona</p><ol>${(s.steps || []).map((x, i) => `<li><b>${i + 1}</b><h3>${esc(x.t)}</h3><p>${esc(x.d)}</p></li>`).join('')}</ol></section>
<section class="wrap"><div class="sec-head"><p class="eyebrow">Tatuagem</p><h2 class="display">Flashes disponíveis</h2><a class="link" href="/flash">Ver todos os ${c.flash.length} →</a></div><div class="fgrid">${flash.map(flashCard).join('')}</div></section>
${fp.length ? `<section class="wrap"><div class="sec-head"><p class="eyebrow">Catálogo</p><h2 class="display">Obras e objetos</h2><a class="link" href="/catalogo">Ver catálogo →</a></div><div class="fgrid four">${fp.map(prodCard).join('')}</div></section>` : ''}
${fj.length ? `<section class="wrap"><div class="sec-head"><p class="eyebrow">Trabalhos</p><h2 class="display">Seleção do portfólio</h2><a class="link" href="/portfolio">Portfólio completo →</a></div><div class="pgrid">${fj.map(projCard).join('')}</div></section>` : ''}
<section class="wrap intro"><p class="eyebrow">Sobre</p><p class="big">${esc((s.bio || [])[0] || '')}</p><a class="link" href="/sobre">Conhecer o artista →</a></section>
<section class="wrap band"><h2 class="display">${esc(s.ctaTitle)}</h2><div class="row"><a class="btn" href="/contato?tipo=tattoo">Agendar tatuagem</a><a class="btn ghost" href="/contato?tipo=produto">Encomendar obra</a><a class="btn ghost" href="${esc(ig(c))}" target="_blank" rel="noopener" data-ev="instagram">Instagram</a></div></section>`, noFab: true
    });
  };

  P.flash = c => {
    const cats = uniq(c.flash.map(f => f.cat));
    return layout(c, {
      title: 'Flash tattoo', active: 'flash', desc: c.settings.flashIntro, body: `
<section class="wrap"><p class="eyebrow">Tatuagem</p><h1 class="display">Flash tattoo</h1><p class="lead narrow">${esc(c.settings.flashIntro)}</p>
<form class="filters" data-filters onsubmit="return false"><label>Buscar<input type="search" name="q" placeholder="Código, ex.: 0273"></label>
<label>Coleção<select name="cat"><option value="">Todas</option>${cats.map(k => `<option>${esc(k)}</option>`).join('')}</select></label>
<label>Disponibilidade<select name="status"><option value="">Todas</option><option value="disponivel">Disponível</option><option value="reservado">Reservado</option><option value="tatuado">Já tatuado</option><option value="exclusivo">Exclusivo</option></select></label>
<a class="link" href="/flash" data-clear>Limpar</a></form>
<p class="muted count" aria-live="polite">${c.flash.length} desenhos</p>
<div class="fgrid" data-grid>${c.flash.map(flashCard).join('')}</div>
<p class="more-wrap"><button class="btn ghost" data-more hidden>Mostrar mais</button></p>
<p class="muted" data-empty hidden>Nenhum desenho encontrado. <a href="/contato?tipo=tattoo">Peça um desenho personalizado</a>.</p></section>`
    });
  };

  P.flashItem = (c, code) => {
    const i = c.flash.findIndex(f => f.code.toLowerCase() === code); if (i < 0) return null;
    const f = c.flash[i], prev = c.flash[i + 1], next = c.flash[i - 1], same = c.flash.filter(x => x.cat === f.cat && x !== f).slice(0, 6);
    const can = ['disponivel', 'exclusivo'].includes(f.status);
    return layout(c, {
      title: 'Flash ' + f.code, active: 'flash', image: img(f.img, 'web'), body: `
<section class="wrap detail"><div class="d-img"><a class="zoom" href="${img(f.img, 'web')}" data-full="${img(f.img, 'web')}"><img src="${img(f.img, 'web')}" alt="Flash tattoo ${esc(f.code)}"></a></div>
<div class="d-info"><p class="eyebrow"><a href="/flash">← Flash tattoo</a></p><h1 class="display sm">${esc(f.title || f.code)}</h1><span class="badge s-${esc(f.status)}">${FLASH_ST[f.status] || esc(f.status)}</span>
<dl class="specs"><dt>Código</dt><dd>${esc(f.code)}</dd><dt>Coleção</dt><dd>${esc(f.cat)}</dd>${f.year ? `<dt>Ano</dt><dd>${esc(f.year)}</dd>` : ''}${f.size ? `<dt>Tamanho</dt><dd>${esc(f.size)}</dd>` : ''}<dt>Valor</dt><dd>${esc(f.price || 'A combinar com o artista')}</dd></dl>
${can ? `<h2 class="h-sm">Quero tatuar este desenho</h2>${form(c, { type: 'tattoo', ref: f.code, button: 'Solicitar agendamento' })}` : `<p>Este desenho não está disponível no momento.</p><a class="btn" href="/contato?tipo=tattoo">Pedir um desenho parecido</a>`}
<nav class="prevnext">${prev ? `<a href="/flash/${prev.code.toLowerCase()}">← ${esc(prev.code)}</a>` : '<span></span>'}${next ? `<a href="/flash/${next.code.toLowerCase()}">${esc(next.code)} →</a>` : ''}</nav></div></section>
${same.length ? `<section class="wrap"><div class="sec-head"><h2 class="display sm">Mais de ${esc(f.cat)}</h2></div><div class="fgrid">${same.map(flashCard).join('')}</div></section>` : ''}`
    });
  };

  P.catalogo = (c, q) => {
    const cats = uniq(c.products.map(p => p.cat)), cur = cats.includes(q.cat) ? q.cat : '';
    const list = c.products.filter(p => !cur || p.cat === cur);
    return layout(c, {
      title: 'Catálogo', active: 'catalogo', desc: c.settings.catalogIntro, body: `
<section class="wrap"><p class="eyebrow">Obras e objetos</p><h1 class="display">Catálogo</h1><p class="lead narrow">${esc(c.settings.catalogIntro)}</p>${tabs('/catalogo', cats, cur)}
<div class="fgrid four">${list.map(prodCard).join('') || '<p class="muted">Nada por aqui ainda.</p>'}</div></section>`
    });
  };

  P.produto = (c, slug) => {
    const i = c.products.findIndex(p => p.slug === slug); if (i < 0) return null; const p = c.products[i];
    const imgs = (p.images || []).filter(media.has), rel = c.products.filter(x => x.cat === p.cat && x !== p).slice(0, 4);
    const can = p.status !== 'esgotado';
    return layout(c, {
      title: p.title, active: 'catalogo', desc: p.desc || undefined, image: imgs[0] && img(imgs[0], 'web'), body: `
<section class="wrap detail prod"><div class="d-img"><div class="gallery">${imgs.map((r, k) => `<a class="zoom" href="${img(r, 'web')}" data-full="${img(r, 'web')}"><img loading="${k ? 'lazy' : 'eager'}" src="${img(r, 'thumb')}" alt="${esc(p.title)} — imagem ${k + 1}"></a>`).join('')}</div></div>
<div class="d-info"><p class="eyebrow"><a href="/catalogo">← Catálogo</a></p><h1 class="display sm">${esc(p.title)}</h1>
<p class="price">${esc(p.price || 'Sob consulta')}</p>${['esgotado', 'encomenda'].includes(p.status) ? `<span class="badge s-${p.status}">${PROD_ST[p.status]}</span>` : ''}
${p.desc ? `<div class="prose">${paras(p.desc)}</div>` : ''}
<dl class="specs"><dt>Código</dt><dd>${esc(p.code)}</dd><dt>Categoria</dt><dd>${esc(p.cat)}</dd></dl>
${can ? `<h2 class="h-sm">Quero encomendar</h2>${form(c, { type: 'produto', ref: `${p.title} (${p.code})`, button: 'Solicitar encomenda' })}` : '<p>Item esgotado. <a href="/contato?tipo=produto">Pergunte sobre uma nova remessa</a>.</p>'}</div></section>
${rel.length ? `<section class="wrap"><div class="sec-head"><h2 class="display sm">Veja também</h2></div><div class="fgrid four">${rel.map(prodCard).join('')}</div></section>` : ''}`
    });
  };

  P.portfolio = (c, q) => {
    const cats = uniq(c.projects.map(p => p.cat)), cur = cats.includes(q.cat) ? q.cat : '';
    return layout(c, {
      title: 'Portfólio', active: 'portfolio', desc: c.settings.portfolioIntro, body: `
<section class="wrap"><p class="eyebrow">Trabalhos</p><h1 class="display">Portfólio</h1><p class="lead narrow">${esc(c.settings.portfolioIntro)}</p>${tabs('/portfolio', cats, cur)}
<div class="pgrid">${c.projects.filter(p => !cur || p.cat === cur).map(projCard).join('')}</div></section>`
    });
  };

  P.projeto = (c, slug) => {
    const i = c.projects.findIndex(p => p.slug === slug); if (i < 0) return null; const p = c.projects[i], imgs = (p.images || []).filter(media.has);
    const pv = c.projects[i - 1], nx = c.projects[i + 1];
    return layout(c, {
      title: p.title, active: 'portfolio', desc: (p.text || '').split('\n')[0].slice(0, 160) || undefined, image: imgs[0] && img(imgs[0], 'web'), body: `
<section class="wrap"><p class="eyebrow"><a href="/portfolio">← Portfólio</a></p><h1 class="display">${esc(p.title)}</h1>
<div class="proj-text"><dl class="specs"><dt>Ano</dt><dd>${esc(p.year)}</dd><dt>Categoria</dt><dd>${esc(p.cat)}</dd></dl>
<div class="prose">${paras(p.text)}${p.concept ? `<h3>Contexto conceitual</h3>${paras(p.concept)}` : ''}${p.link ? `<p><a class="btn" href="${esc(p.link)}">${esc(p.linkLabel || 'Ver mais')}</a></p>` : ''}</div></div>
<div class="gallery">${imgs.map((r, k) => `<a class="zoom" href="${img(r, 'web')}" data-full="${img(r, 'web')}"><img loading="${k ? 'lazy' : 'eager'}" decoding="async" src="${img(r, 'thumb')}" alt="${esc(p.title)} — imagem ${k + 1}"></a>`).join('')}</div>
<nav class="prevnext">${pv ? `<a href="/portfolio/${esc(pv.slug)}">← ${esc(pv.title)}</a>` : '<span></span>'}${nx ? `<a href="/portfolio/${esc(nx.slug)}">${esc(nx.title)} →</a>` : ''}</nav></section>`
    });
  };

  P.sobre = c => {
    const s = c.settings, cv = (c.cv || []).filter(x => (x.items || []).length), ai = (s.aboutImages || []).filter(media.has);
    return layout(c, {
      title: 'Sobre', active: 'sobre', body: `
<section class="wrap split about"><div><p class="eyebrow">Sobre</p><h1 class="display">${esc(s.name)}</h1><div class="prose big">${(s.bio || []).map(p => `<p>${esc(p)}</p>`).join('')}</div>
<div class="row noprint"><a class="btn" href="/contato">Falar com o artista</a>${cv.length ? '<a class="btn ghost" href="#curriculo">Currículo</a>' : ''}</div></div>
<div class="stack noprint">${ai.map(r => `<img loading="lazy" src="${img(r, 'web')}" alt="">`).join('')}</div></section>
${cv.length ? `<section class="wrap narrow" id="curriculo"><p class="eyebrow">Currículo artístico</p><div class="row noprint"><button class="btn ghost" data-print data-ev="print_cv">Baixar / imprimir em PDF</button></div>
${cv.map(sec => `<section class="cv-sec"><h2>${esc(sec.title)}</h2>${sec.items.map(it => `<div class="cv-row"><span class="period">${esc(it.period)}</span><div><strong>${esc(it.title)}</strong>${it.desc ? `<p>${esc(it.desc)}</p>` : ''}</div></div>`).join('')}</section>`).join('')}</section>` : ''}`
    });
  };

  P.contato = (c, q) => {
    const t = ['tattoo', 'produto', 'outro'].includes(q.tipo) ? q.tipo : 'tattoo';
    return layout(c, {
      title: 'Contato', active: 'contato', desc: c.settings.contactIntro, noFab: true, body: `
<section class="wrap split"><div><p class="eyebrow">Contato</p><h1 class="display">Fale comigo</h1><p class="lead">${esc(c.settings.contactIntro)}</p>
${q.enviado ? '<p class="alert ok">Pedido recebido! O artista vai te responder em breve.</p>' : ''}<p class="muted">Prefere falar direto?</p>${contacts(c)}</div>
<div><h2 class="h-sm">Enviar solicitação</h2>${form(c, { type: '', refValue: q.flash || '', ...{} }).replace('data-type=""', `data-type="" data-default="${t}"`)}</div></section>`
    });
  };

  P.privacidade = c => layout(c, { title: 'Privacidade', body: `<section class="wrap narrow"><p class="eyebrow">Informações</p><h1 class="display">Privacidade</h1><div class="prose">${paras(c.settings.privacy)}</div></section>` });
  P.notfound = c => layout(c, { title: 'Página não encontrada', body: `<section class="wrap narrow"><p class="eyebrow">Erro 404</p><h1 class="display">Página não encontrada</h1><p class="lead">O endereço pode ter mudado.</p><div class="row"><a class="btn" href="/">Início</a><a class="btn ghost" href="/portfolio">Portfólio</a><a class="btn ghost" href="/catalogo">Catálogo</a></div></section>` });

  P.sitemap = (c, base) => {
    const u = ['/', '/flash', '/catalogo', '/portfolio', '/sobre', '/contato', ...c.flash.map(f => '/flash/' + f.code.toLowerCase()), ...c.products.map(p => '/catalogo/' + p.slug), ...c.projects.map(p => '/portfolio/' + p.slug)];
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${u.map(x => `<url><loc>${esc(base + x)}</loc></url>`).join('')}</urlset>`;
  };
  return P;
};
