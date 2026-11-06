(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const U = (r, sz) => r.startsWith('u/') ? `/media/u/${sz}/${r.slice(2)}` : `/media/${r.split('/')[0]}/${sz}/${r.split('/')[1]}.webp`;
  const FST = { disponivel: 'Disponível', reservado: 'Reservado', tatuado: 'Já tatuado', exclusivo: 'Exclusivo' }, PST = { disponivel: 'Disponível', sob_consulta: 'Sob consulta', encomenda: 'Sob encomenda', esgotado: 'Esgotado' };
  const OST = { novo: 'Novo', conversando: 'Em conversa', fechado: 'Fechado', descartado: 'Descartado' }, OTYPE = { tattoo: 'Tatuagem', produto: 'Encomenda', outro: 'Outro assunto' };
  let C = null, ME = null, ST = null, ORD = [], days = 30;
  const app = $('#app');

  // ---------- base
  async function api(m, u, b) {
    const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json', 'X-Panel': '1' }, body: b === undefined ? undefined : JSON.stringify(b) });
    if (r.status === 401) { loginView(); throw new Error('login'); }
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Erro inesperado'); return j;
  }
  let tt; function toast(m, err) { const t = $('#toast'); t.textContent = m; t.className = 'on' + (err ? ' err' : ''); clearTimeout(tt); tt = setTimeout(() => t.className = '', 2800); }
  const fail = e => { if (e.message !== 'login') toast(e.message, true); };
  const save = async sec => { try { await api('PUT', '/api/admin/content/' + sec, { value: C[sec] }); toast('Salvo ✓'); return true; } catch (e) { fail(e); return false; } };
  const uniq = a => [...new Set(a.filter(Boolean))];
  const fmtD = t => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  // ---------- janela (modal)
  const dlg = $('#dlg'); let onSave = null;
  function modal(title, inner, save, label) {
    $('#dt').textContent = title; $('#db').innerHTML = inner;
    $('#df').innerHTML = `<button class="btn ghost" data-close>${save ? 'Cancelar' : 'Fechar'}</button>${save ? `<button class="btn" id="dsave">${label || 'Salvar'}</button>` : ''}`;
    onSave = save; if (!dlg.open) dlg.showModal(); return $('#db');
  }
  dlg.addEventListener('click', async e => {
    if (e.target.closest('[data-close]') || e.target === dlg) return dlg.close();
    if (e.target.id === 'dsave' && onSave) { e.target.disabled = true; try { if (await onSave($('#db')) !== false) dlg.close(); } catch (x) { fail(x); } e.target.disabled = false; }
  });

  // ---------- imagens: enviar (redimensiona no navegador) e escolher da biblioteca
  const canWebp = (() => { try { return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp'); } catch (e) { return false; } })();
  async function prep(file) {
    const bmp = await createImageBitmap(file), mime = canWebp ? 'image/webp' : 'image/jpeg';
    const mk = (max, q) => { const k = Math.min(1, max / Math.max(bmp.width, bmp.height)), cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); const x = cv.getContext('2d'); if (!canWebp) { x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); } x.drawImage(bmp, 0, 0, cv.width, cv.height); return cv.toDataURL(mime, q); };
    return { web: mk(1600, .82), thumb: mk(600, .8) };
  }
  async function upload(files) {
    const refs = []; let n = 0;
    for (const f of files) { n++; toast(`Enviando ${n} de ${files.length}…`); try { refs.push((await api('POST', '/api/admin/upload', await prep(f))).ref); } catch (e) { fail(e); } }
    if (refs.length) toast(refs.length + (refs.length > 1 ? ' imagens enviadas ✓' : ' imagem enviada ✓')); return refs;
  }
  async function pick(multi) {
    const { refs } = await api('GET', '/api/admin/media'), folders = uniq(refs.map(r => r.split('/')[0]));
    return new Promise(res => {
      const sel = []; let f = '', shown = 150;
      const draw = () => { const l = refs.filter(r => !f || r.split('/')[0] === f); $('#lib').innerHTML = l.slice(0, shown).map(r => `<img loading="lazy" data-r="${esc(r)}" src="${U(r, 'thumb')}" class="${sel.includes(r) ? 'sel' : ''}">`).join(''); $('#libmore').hidden = l.length <= shown; };
      dlg.addEventListener('close', () => res([]), { once: true });
      modal('Biblioteca de imagens', `<div class="tools"><select id="libf"><option value="">Todas as pastas</option>${folders.map(x => `<option>${esc(x)}</option>`).join('')}</select><span class="mut sm">${multi ? 'Clique para marcar várias.' : 'Clique para escolher.'}</span></div><div class="lib" id="lib"></div><p><button class="btn ghost" id="libmore">Mostrar mais</button></p>`, () => { res(sel); }, 'Usar selecionadas');
      draw(); $('#libf').onchange = e => { f = e.target.value; shown = 150; draw(); }; $('#libmore').onclick = () => { shown += 150; draw(); };
      $('#lib').onclick = e => { const r = e.target.dataset && e.target.dataset.r; if (!r) return; const i = sel.indexOf(r); if (i > -1) sel.splice(i, 1); else { if (!multi) sel.length = 0; sel.push(r); } draw(); };
    });
  }
  function imgList(host, refs, max) {
    let list = [...refs]; max = max || 99;
    const draw = () => { host.innerHTML = `<div class="imgs">${list.map((r, i) => `<div class="im"><img src="${U(r, 'thumb')}" alt=""><div class="ct"><button type="button" data-a="l" data-i="${i}" title="Mover">‹</button><button type="button" data-a="x" data-i="${i}" title="Remover">×</button><button type="button" data-a="r" data-i="${i}" title="Mover">›</button></div></div>`).join('') || '<p class="mut sm">Nenhuma imagem.</p>'}</div>
<div class="row"><label class="btn s ghost">+ Enviar do computador/celular<input type="file" accept="image/*" multiple hidden></label><button type="button" class="btn s ghost" data-a="lib">Escolher da biblioteca</button></div>`; };
    host.onclick = async e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const i = +b.dataset.i, a = b.dataset.a;
      if (a === 'x') list.splice(i, 1); else if (a === 'l' && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]]; else if (a === 'r' && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
      else if (a === 'lib') { const snap = host._snap && host._snap(), add = await pick(max > 1); if (host._reopen) return host._reopen(add, snap); list = list.concat(add).slice(0, max); }
      draw();
    };
    host.onchange = async e => { if (e.target.type !== 'file') return; list = list.concat(await upload([...e.target.files])).slice(0, max); draw(); };
    draw(); return { get: () => list, add: r => { list = list.concat(r).slice(0, max); draw(); } };
  }

  // ---------- formulário genérico
  const catList = (sec) => uniq(C[sec].map(x => x.cat));
  function fieldHtml(f, v, sec) {
    const id = 'f_' + f.k, val = v == null ? '' : v;
    if (f.t === 'check') return `<label class="f"><input type="checkbox" data-k="${f.k}" ${v ? 'checked' : ''}> ${esc(f.l)}</label>`;
    if (f.t === 'select') return `<label class="f"><span>${esc(f.l)}</span><select data-k="${f.k}">${Object.entries(f.o).map(([k, n]) => `<option value="${k}" ${k === val ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
    if (f.t === 'area') return `<label class="f"><span>${esc(f.l)} ${f.h ? `<small>${esc(f.h)}</small>` : ''}</span><textarea data-k="${f.k}" rows="${f.r || 4}">${esc(val)}</textarea></label>`;
    if (f.t === 'cat') return `<label class="f"><span>${esc(f.l)}</span><input data-k="${f.k}" list="dl_${sec}" value="${esc(val)}"><datalist id="dl_${sec}">${catList(sec).map(c => `<option value="${esc(c)}">`).join('')}</datalist></label>`;
    return `<label class="f"><span>${esc(f.l)} ${f.h ? `<small>${esc(f.h)}</small>` : ''}</span><input data-k="${f.k}" value="${esc(val)}" ${f.t === 'num' ? 'inputmode="numeric"' : ''}></label>`;
  }
  const collect = (root, fields) => { const o = {}; fields.forEach(f => { const el = $(`[data-k="${f.k}"]`, root); o[f.k] = f.t === 'check' ? el.checked : f.t === 'num' ? (parseInt(el.value) || null) : el.value.trim(); }); return o; };

  const SPECS = {
    flash: { title: 'Flash tattoo', one: 'flash', fields: [{ k: 'title', l: 'Título', h: '(opcional)' }, { k: 'cat', l: 'Coleção', t: 'cat' }, { k: 'status', l: 'Disponibilidade', t: 'select', o: FST }, { k: 'price', l: 'Valor', h: '(opcional — vazio = “a combinar”)' }, { k: 'year', l: 'Ano', t: 'num' }, { k: 'size', l: 'Tamanho sugerido', h: '(opcional)' }] },
    products: { title: 'Catálogo', one: 'produto', fields: [{ k: 'title', l: 'Nome' }, { k: 'cat', l: 'Categoria', t: 'cat' }, { k: 'status', l: 'Situação', t: 'select', o: PST }, { k: 'price', l: 'Preço', h: '(ex.: R$ 350 — vazio = “Sob consulta”)' }, { k: 'code', l: 'Código' }, { k: 'desc', l: 'Descrição', t: 'area', h: '(opcional)' }, { k: 'featured', l: 'Mostrar na página inicial', t: 'check' }] },
    projects: { title: 'Portfólio', one: 'projeto', fields: [{ k: 'title', l: 'Título' }, { k: 'cat', l: 'Categoria', t: 'cat' }, { k: 'year', l: 'Ano' }, { k: 'text', l: 'Texto', t: 'area', r: 6, h: '(separe parágrafos com uma linha em branco)' }, { k: 'concept', l: 'Contexto conceitual', t: 'area', r: 4, h: '(opcional)' }, { k: 'link', l: 'Botão — endereço', h: '(opcional, ex.: /catalogo)' }, { k: 'linkLabel', l: 'Botão — texto' }, { k: 'featured', l: 'Mostrar na página inicial', t: 'check' }] },
  };
  const slug = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';

  function editItem(sec, item, isNew, after) {
    const sp = SPECS[sec], hasImgs = sec !== 'flash';
    const body = modal((isNew ? 'Novo — ' : 'Editar — ') + sp.one, sp.fields.map(f => fieldHtml(f, item[f.k], sec)).join('') + (hasImgs ? '<div class="f"><span style="font-weight:600;font-size:13px">Imagens <small class="mut">(a primeira é a capa)</small></span><div id="il"></div></div>' : ''), async root => {
      const o = collect(root, sp.fields);
      if (!o.title && sec !== 'flash') { toast('Dê um título.', true); return false; }
      Object.assign(item, o); if (hasImgs) item.images = il.get();
      if (isNew) { item.slug = uniq([slug(o.title)]).map(s => { let b = s, n = 2; while (C[sec].some(x => x.slug === s)) s = b + '-' + n++; return s; })[0]; C[sec].push(item); }
      if (await save(sec)) { after && after(); render(); } else return false;
    });
    var il = hasImgs ? imgList($('#il', body), item.images || []) : null;
    if (il) { const h = $('#il', body); h._snap = () => collect(body, sp.fields); h._reopen = (add, snap) => editItem(sec, Object.assign(item, snap, { images: il.get().concat(add || []) }), isNew, after); }
    return body;
  }

  // ---------- telas
  const NAV = [['resumo', 'Resumo'], ['pedidos', 'Pedidos'], ['flash', 'Flash tattoo'], ['catalogo', 'Catálogo'], ['portfolio', 'Portfólio'], ['textos', 'Textos e páginas'], ['config', 'Configurações']];
  function shell(route, inner) {
    app.innerHTML = `<div class="shell"><aside class="side"><div class="lg">OGEID<small>Painel</small></div>${NAV.map(([k, n]) => `<a href="#/${k}" class="${k === route ? 'on' : ''}">${n}${k === 'pedidos' && ME.novos ? `<span class="pill">${ME.novos}</span>` : ''}</a>`).join('')}<div class="sp"></div><a href="/" target="_blank" rel="noopener">Ver o site ↗</a><button class="lk" id="out">Sair</button></aside><main>${inner}</main></div>`;
    $('#out').onclick = async () => { await api('POST', '/api/logout', {}).catch(() => { }); loginView(); };
  }
  function loginView(msg) {
    app.innerHTML = `<div class="login"><form id="lf"><div class="lg">OGEID</div><p class="sub">Painel de controle</p><label class="f"><span>E-mail</span><input name="email" type="email" required autocomplete="username"></label><label class="f"><span>Senha</span><input name="password" type="password" required autocomplete="current-password"></label><p class="err" id="le">${esc(msg || '')}</p><button class="btn" style="width:100%;justify-content:center">Entrar</button></form></div>`;
    $('#lf').onsubmit = async e => { e.preventDefault(); const f = e.target; try { await api('POST', '/api/login', { email: f.email.value, password: f.password.value }); start(); } catch (x) { $('#le').textContent = x.message === 'login' ? 'E-mail ou senha incorretos.' : x.message; } };
  }

  // --- Resumo (visitas)
  async function viewResumo() {
    shell('resumo', '<p class="mut">Carregando…</p>');
    ST = await api('GET', '/api/admin/stats?days=' + days); ORD = await api('GET', '/api/admin/orders');
    const ev = ST.events, contatos = (ev.whatsapp || 0) + (ev.instagram || 0) + (ev.email || 0) + (ev.pedido || 0), novos = ORD.filter(o => o.status === 'novo');
    const max = Math.max(1, ...ST.series.map(s => s.views)), W = 800, H = 200, bw = W / ST.series.length;
    const chart = `<svg class="chart" viewBox="0 0 ${W} ${H + 18}" preserveAspectRatio="none" role="img" aria-label="Visitas por dia">${ST.series.map((s, i) => `<g><title>${s.d.split('-').reverse().join('/')} — ${s.views} visualizações, ${s.visitors} visitantes</title><rect class="v" x="${i * bw + 1}" y="${H - s.views / max * H}" width="${Math.max(1, bw - 2)}" height="${s.views / max * H}"/><rect class="u" x="${i * bw + bw * .25}" y="${H - s.visitors / max * H}" width="${Math.max(1, bw * .5)}" height="${s.visitors / max * H}"/></g>`).join('')}<text x="0" y="${H + 14}">${ST.series[0].d.split('-').reverse().slice(0, 2).join('/')}</text><text x="${W}" y="${H + 14}" text-anchor="end">${ST.series[ST.series.length - 1].d.split('-').reverse().slice(0, 2).join('/')}</text><text x="${W}" y="10" text-anchor="end">máx. ${max}/dia</text></svg>`;
    const top = (l, arr, withImg) => { const m = Math.max(1, ...arr.map(x => x.views)); return `<div class="card"><h2>${l}</h2>${arr.length ? `<ul class="top">${arr.map(x => `<li>${withImg ? (x.img ? `<img src="${x.img}" alt="">` : '<img alt="">') : ''}<div class="n"><a href="${esc(x.href)}" target="_blank" rel="noopener">${esc(x.label)}</a><div class="bar" style="width:${x.views / m * 100}%"></div></div><b title="${x.visitors} visitantes">${x.views}</b></li>`).join('')}</ul>` : '<p class="mut sm">Ainda sem dados neste período.</p>'}</div>`; };
    const sm = (l, arr) => `<div class="card"><h2>${l}</h2>${arr.length ? `<ul class="top">${arr.map(([k, v]) => `<li><span class="n">${esc(k)}</span><b>${v}</b></li>`).join('')}</ul>` : '<p class="mut sm">Sem dados.</p>'}</div>`;
    const evn = { pedido: 'Pedidos enviados', whatsapp: 'Cliques no WhatsApp', instagram: 'Cliques no Instagram', email: 'Cliques no e-mail', cta_topo: 'Botão “Agendar” (topo)', cta_hero_agendar: 'Botão “Agendar” (início)', cta_fab: 'Botão flutuante (celular)', print_cv: 'Currículo impresso/baixado' };
    shell('resumo', `<div class="row" style="justify-content:space-between"><div><h1>Resumo</h1><p class="sub">Quem visita o site e o que mais chama atenção.</p></div><div class="seg">${[7, 30, 90].map(d => `<button data-d="${d}" class="${d === days ? 'on' : ''}">${d} dias</button>`).join('')}</div></div>
<div class="kpis"><div class="kpi"><b>${ST.views}</b><span>Visualizações</span></div><div class="kpi"><b>${ST.visitors}</b><span>Visitantes (soma dos dias)</span></div><div class="kpi"><b>${ev.pedido || 0}</b><span>Pedidos recebidos</span></div><div class="kpi"><b>${contatos}</b><span>Contatos gerados</span></div></div>
${novos.length ? `<div class="card"><h2>${novos.length} pedido${novos.length > 1 ? 's' : ''} novo${novos.length > 1 ? 's' : ''} aguardando resposta</h2><p class="sm mut">${novos.slice(0, 3).map(o => esc(o.name) + ' — ' + esc(OTYPE[o.type]) + (o.ref ? ' (' + esc(o.ref) + ')' : '')).join(' · ')}</p><a class="btn s" href="#/pedidos">Abrir pedidos</a></div>` : ''}
<div class="card"><h2>Visitas por dia</h2>${chart}<div class="legend"><span><i style="background:#c9d6ee"></i>Visualizações</span><span><i style="background:#0b45a8"></i>Visitantes</span></div></div>
<div class="grid2">${top('Flashes mais vistos', ST.tops.flash, 1)}${top('Obras do catálogo mais vistas', ST.tops.produtos, 1)}${top('Projetos do portfólio mais vistos', ST.tops.projetos, 1)}${top('Páginas mais visitadas', ST.tops.paginas)}${sm('De onde vêm as visitas', ST.refs)}${sm('Aparelhos', ST.devices)}${sm('Ações dos visitantes', Object.entries(ev).map(([k, v]) => [evn[k] || k, v]).sort((a, b) => b[1] - a[1]))}</div>
<p class="sm mut">As visitas são contadas sem cookies e sem guardar IP. Suas próprias visitas (logado no painel neste navegador) não entram na conta.</p>`);
    $$('[data-d]').forEach(b => b.onclick = () => { days = +b.dataset.d; viewResumo().catch(fail); });
  }

  // --- Pedidos
  let ofilter = 'abertos';
  async function viewPedidos() {
    ORD = await api('GET', '/api/admin/orders'); ME.novos = ORD.filter(o => o.status === 'novo').length;
    const list = ORD.filter(o => ofilter === 'todos' || (ofilter === 'abertos' ? ['novo', 'conversando'].includes(o.status) : o.status === ofilter));
    const link = c => /^[\d\s()+-]{8,}$/.test(c) ? `<a href="https://wa.me/${c.replace(/\D/g, '').replace(/^(\d{10,11})$/, '55$1')}" target="_blank" rel="noopener">${esc(c)}</a>` : /^\S+@\S+\.\S+$/.test(c) ? `<a href="mailto:${esc(c)}">${esc(c)}</a>` : /^@?[\w.]+$/.test(c) ? `<a href="https://instagram.com/${esc(c.replace('@', ''))}" target="_blank" rel="noopener">${esc(c)}</a>` : esc(c);
    shell('pedidos', `<div class="row" style="justify-content:space-between"><div><h1>Pedidos</h1><p class="sub">Solicitações enviadas pelo site.</p></div><a class="btn ghost" href="/api/admin/orders.csv">Baixar planilha (CSV)</a></div>
<div class="tools"><div class="seg">${[['abertos', 'Em aberto'], ['novo', 'Novos'], ['fechado', 'Fechados'], ['descartado', 'Descartados'], ['todos', 'Todos']].map(([k, n]) => `<button data-f="${k}" class="${k === ofilter ? 'on' : ''}">${n}</button>`).join('')}</div></div>
${list.map(o => { const f = o.fields || {}; return `<div class="order ${o.status}" data-id="${o.id}"><div class="hd"><strong>${esc(o.name)}</strong><span class="bd s-${o.status}">${OST[o.status]}</span><span class="bd">${OTYPE[o.type] || o.type}</span><span class="mut sm">${fmtD(o.at)}</span></div>
<div>${o.ref ? `<b>${esc(o.ref)}</b> · ` : ''}${link(o.contact)}</div>${[f.regiao && 'Região: ' + f.regiao, f.tamanho && 'Tamanho: ' + f.tamanho, f.quando && 'Quando: ' + f.quando, f.quantidade && o.type === 'produto' && 'Qtd: ' + f.quantidade].filter(Boolean).length ? `<div class="sm mut">${[f.regiao && 'Região: ' + f.regiao, f.tamanho && 'Tamanho: ' + f.tamanho, f.quando && 'Quando: ' + f.quando, f.quantidade && o.type === 'produto' && 'Qtd: ' + f.quantidade].filter(Boolean).map(esc).join(' · ')}</div>` : ''}${o.message ? `<pre>${esc(o.message)}</pre>` : ''}
<div class="ft"><select data-st>${Object.entries(OST).map(([k, n]) => `<option value="${k}" ${k === o.status ? 'selected' : ''}>${n}</option>`).join('')}</select><input data-notes placeholder="Anotações (só você vê)" value="${esc(o.notes)}" style="flex:1;min-width:180px"><button class="btn s red" data-del>Excluir</button></div></div>`; }).join('') || '<p class="mut">Nenhum pedido aqui.</p>'}`);
    $$('[data-f]').forEach(b => b.onclick = () => { ofilter = b.dataset.f; viewPedidos().catch(fail); });
    $$('.order').forEach(el => {
      const id = el.dataset.id, patch = b => api('PATCH', '/api/admin/orders/' + id, b).then(() => toast('Salvo ✓')).catch(fail);
      $('[data-st]', el).onchange = async e => { await patch({ status: e.target.value }); viewPedidos(); };
      $('[data-notes]', el).onchange = e => patch({ notes: e.target.value });
      $('[data-del]', el).onclick = async () => { if (confirm('Excluir este pedido definitivamente?')) { await api('DELETE', '/api/admin/orders/' + id).catch(fail); viewPedidos(); } };
    });
  }

  // --- Flash tattoo
  const fs = { q: '', cat: '', st: '', sel: new Set(), n: 60 };
  function viewFlash() {
    const cats = catList('flash'), all = C.flash.filter(f => (!fs.q || f.code.toLowerCase().includes(fs.q.toLowerCase()) || (f.title || '').toLowerCase().includes(fs.q.toLowerCase())) && (!fs.cat || f.cat === fs.cat) && (!fs.st || f.status === fs.st));
    shell('flash', `<div class="row" style="justify-content:space-between"><div><h1>Flash tattoo</h1><p class="sub">${C.flash.length} desenhos. Clique num desenho para editar; marque vários para mudar de uma vez.</p></div><button class="btn" id="addf">+ Adicionar flashes</button></div>
<div class="tools"><input type="search" id="q" placeholder="Buscar código…" value="${esc(fs.q)}"><select id="fc"><option value="">Todas as coleções</option>${cats.map(c => `<option ${c === fs.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select><select id="fst"><option value="">Qualquer situação</option>${Object.entries(FST).map(([k, n]) => `<option value="${k}" ${k === fs.st ? 'selected' : ''}>${n}</option>`).join('')}</select><button class="btn ghost s" id="sall">Marcar os ${all.length} filtrados</button></div>
${fs.sel.size ? `<div class="card"><h2>${fs.sel.size} selecionado${fs.sel.size > 1 ? 's' : ''}</h2><div class="tools" style="margin:0"><select id="bst"><option value="">Situação…</option>${Object.entries(FST).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select><input id="bcat" list="dlb" placeholder="Mover p/ coleção…"><datalist id="dlb">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist><input id="bpr" placeholder="Valor…"><button class="btn" id="bapply">Aplicar</button><button class="btn red" id="bdel">Excluir</button><button class="btn ghost s" id="bclr">Limpar seleção</button></div></div>` : ''}
<div class="fg">${all.slice(0, fs.n).map(f => `<div class="fi ${fs.sel.has(f.code) ? 'sel' : ''}" data-c="${esc(f.code)}"><input type="checkbox" ${fs.sel.has(f.code) ? 'checked' : ''} aria-label="Selecionar ${esc(f.code)}"><img loading="lazy" src="${U(f.img, 'thumb')}" alt=""><div class="m"><b>${esc(f.code.replace('OG-F-', ''))}</b><span class="bd s-${f.status}">${FST[f.status] || f.status}</span></div></div>`).join('')}</div>
${all.length > fs.n ? '<p><button class="btn ghost" id="more">Mostrar mais</button></p>' : ''}`);
    const re = () => viewFlash();
    $('#q').oninput = e => { fs.q = e.target.value; clearTimeout(re.t); re.t = setTimeout(() => { re(); const q = $('#q'); q.focus(); q.setSelectionRange(99, 99); }, 250); };
    $('#fc').onchange = e => { fs.cat = e.target.value; fs.n = 60; re(); }; $('#fst').onchange = e => { fs.st = e.target.value; fs.n = 60; re(); };
    $('#sall').onclick = () => { all.forEach(f => fs.sel.add(f.code)); re(); }; if ($('#more')) $('#more').onclick = () => { fs.n += 60; re(); };
    $('.fg').onclick = e => { const el = e.target.closest('.fi'); if (!el) return; const c = el.dataset.c; if (e.target.tagName === 'INPUT') { fs.sel.has(c) ? fs.sel.delete(c) : fs.sel.add(c); return re(); } editItem('flash', C.flash.find(f => f.code === c), false); };
    if (fs.sel.size) {
      $('#bclr').onclick = () => { fs.sel.clear(); re(); };
      $('#bapply').onclick = async () => { const st = $('#bst').value, cat = $('#bcat').value.trim(), pr = $('#bpr').value.trim(); if (!st && !cat && !pr) return toast('Escolha o que mudar.', true); C.flash.forEach(f => { if (fs.sel.has(f.code)) { if (st) f.status = st; if (cat) f.cat = cat; if (pr) f.price = pr; } }); if (await save('flash')) { fs.sel.clear(); re(); } };
      $('#bdel').onclick = async () => { if (confirm(`Excluir ${fs.sel.size} flash(es) do site?`)) { C.flash = C.flash.filter(f => !fs.sel.has(f.code)); if (await save('flash')) { fs.sel.clear(); re(); } } };
    }
    $('#addf').onclick = () => {
      const b = modal('Adicionar flashes', `<label class="f"><span>Coleção</span><input id="ac" list="dla" value="${esc((C.flash[0] || {}).cat || 'Flash ' + new Date().getFullYear())}"><datalist id="dla">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist></label><label class="f"><span>Imagens</span><input type="file" id="af" accept="image/*" multiple></label><p class="sm mut">Cada imagem vira um flash novo, com código automático. Dica: fundo branco e desenho centralizado.</p>`, async root => {
        const files = [...$('#af', root).files]; if (!files.length) { toast('Escolha as imagens.', true); return false; }
        const refs = await upload(files), cat = $('#ac', root).value.trim() || 'Flash'; let n = Math.max(0, ...C.flash.map(f => +(f.code.match(/(\d+)$/) || [])[1] || 0));
        refs.forEach(r => { n++; C.flash.unshift({ code: 'OG-F-' + String(n).padStart(4, '0'), img: r, cat, status: 'disponivel', price: '', title: '', size: '', year: new Date().getFullYear() }); });
        if (refs.length && await save('flash')) re(); else return false;
      }, 'Publicar');
    };
  }

  // --- Catálogo e Portfólio (listas)
  function viewList(sec, route) {
    const sp = SPECS[sec], arr = C[sec], blank = () => sec === 'products' ? { code: 'OG-P-' + String(arr.length + 1).padStart(3, '0'), title: '', cat: (arr[0] || {}).cat || '', status: 'sob_consulta', price: '', desc: '', images: [], featured: false } : { title: '', cat: (arr[0] || {}).cat || '', year: String(new Date().getFullYear()), text: '', concept: '', images: [], featured: false, link: '', linkLabel: '' };
    shell(route, `<div class="row" style="justify-content:space-between"><div><h1>${sp.title}</h1><p class="sub">${sec === 'products' ? 'Obras e objetos que o cliente pode pedir.' : 'Projetos exibidos no portfólio.'} A ordem aqui é a ordem no site.</p></div><button class="btn" id="new">+ Novo</button></div>
<div class="list">${arr.map((p, i) => `<div class="it" data-i="${i}"><img src="${(p.images || [])[0] ? U(p.images[0], 'thumb') : ''}" alt=""><div class="n"><b>${esc(p.title)}</b><span class="mut sm">${esc(p.cat)} · ${sec === 'products' ? esc(p.price || 'Sob consulta') + ' · ' + PST[p.status] : esc(p.year)}${p.featured ? ' · ★ na página inicial' : ''}</span></div><button class="btn s ghost" data-a="up" title="Subir">↑</button><button class="btn s ghost" data-a="dn" title="Descer">↓</button><button class="btn s" data-a="ed">Editar</button><button class="btn s red" data-a="rm">Excluir</button></div>`).join('') || '<p class="mut">Nada ainda.</p>'}</div>`);
    $('#new').onclick = () => editItem(sec, blank(), true);
    $('.list').onclick = async e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const i = +b.closest('.it').dataset.i, a = b.dataset.a;
      if (a === 'ed') return editItem(sec, arr[i], false);
      if (a === 'rm') { if (!confirm(`Excluir “${arr[i].title}” do site?`)) return; arr.splice(i, 1); }
      else { const j = a === 'up' ? i - 1 : i + 1; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }
      await save(sec); viewList(sec, route);
    };
  }

  // --- Textos e páginas
  const SET = [
    ['Página inicial', [['title', 'Título do site (aba do navegador)'], ['tagline', 'Frase de apresentação', 'area', 2], ['ctaTitle', 'Chamada final']]],
    ['Textos de cada página', [['flashIntro', 'Flash tattoo — introdução', 'area', 2], ['catalogIntro', 'Catálogo — introdução', 'area', 2], ['portfolioIntro', 'Portfólio — introdução', 'area', 2], ['contactIntro', 'Contato — introdução', 'area', 2], ['orderNote', 'Aviso abaixo dos formulários', 'area', 2]]],
    ['Rodapé, busca (Google) e privacidade', [['footerNote', 'Texto do rodapé'], ['description', 'Descrição para o Google', 'area', 2], ['privacy', 'Página de privacidade', 'area', 7]]],
  ];
  function viewTextos() {
    const s = C.settings, cv = C.cv;
    const rowsSteps = () => (s.steps || []).map((x, i) => `<div class="rw"><input data-s="t" value="${esc(x.t)}" placeholder="Título"><input data-s="d" value="${esc(x.d)}" placeholder="Descrição"><span></span></div>`).join('');
    const cvHtml = () => cv.map((sec, i) => `<fieldset data-cv="${i}"><legend><input data-ct value="${esc(sec.title)}" style="width:220px"></legend><div class="rows cv">${sec.items.map(it => `<div class="rw"><input data-p value="${esc(it.period)}" placeholder="Período"><input data-t value="${esc(it.title)}" placeholder="Título"><input data-d value="${esc(it.desc)}" placeholder="Descrição (opcional)"><button class="btn s red" data-rmi>×</button></div>`).join('')}</div><p><button class="btn s ghost" data-addi>+ Linha</button> <button class="btn s red" data-rms>Excluir seção</button></p></fieldset>`).join('');
    shell('textos', `<h1>Textos e páginas</h1><p class="sub">Tudo o que aparece escrito no site. Seções do currículo sem nenhuma linha ficam escondidas.</p><div id="tx">
${SET.map(([t, fl]) => `<fieldset><legend>${t}</legend>${fl.map(([k, l, ty, r]) => fieldHtml({ k, l, t: ty, r }, s[k], 'x')).join('')}${t === 'Página inicial' ? `<div class="f"><span style="font-weight:600;font-size:13px">Imagens do topo (até 4)</span><div id="hi"></div></div><div class="f"><span style="font-weight:600;font-size:13px">“Como funciona” — 3 passos</span><div class="rows" id="steps">${rowsSteps()}</div></div>` : ''}</fieldset>`).join('')}
<fieldset><legend>Sobre</legend>${fieldHtml({ k: 'bio', l: 'Texto do artista', t: 'area', r: 10, h: '(um parágrafo por bloco, separados por linha em branco)' }, (s.bio || []).join('\n\n'), 'x')}<div class="f"><span style="font-weight:600;font-size:13px">Fotos ao lado do texto (até 3)</span><div id="ai"></div></div></fieldset>
<fieldset><legend>Menu do site</legend>${(s.nav || []).map((n, i) => `<div class="rw" style="grid-template-columns:1fr auto;display:grid;gap:10px"><input data-nl="${i}" value="${esc(n.label)}"><label class="f"><input type="checkbox" data-ns="${i}" ${n.show ? 'checked' : ''}> Mostrar</label></div>`).join('')}</fieldset>
<h2>Currículo</h2><div id="cv">${cvHtml()}</div><p><button class="btn ghost" id="addsec">+ Nova seção</button></p>
<div class="savebar"><button class="btn" id="sv">Salvar alterações</button><span class="mut sm">Vai direto para o site.</span></div></div>`);
    const hi = imgList($('#hi'), s.heroImages || [], 4), ai = imgList($('#ai'), s.aboutImages || [], 3);
    const syncCv = () => { $$('[data-cv]').forEach((fsx, i) => { cv[i].title = $('[data-ct]', fsx).value; cv[i].items = $$('.rw', fsx).map(r => ({ period: $('[data-p]', r).value, title: $('[data-t]', r).value, desc: $('[data-d]', r).value })); }); };
    $('#cv').onclick = e => {
      const f = e.target.closest('[data-cv]'); if (!f) return; const i = +f.dataset.cv; syncCv();
      if (e.target.closest('[data-addi]')) cv[i].items.push({ period: '', title: '', desc: '' }); else if (e.target.closest('[data-rms]')) { if (!confirm('Excluir a seção?')) return; cv.splice(i, 1); } else if (e.target.closest('[data-rmi]')) cv[i].items.splice([...$$('.rw', f)].indexOf(e.target.closest('.rw')), 1); else return;
      $('#cv').innerHTML = cvHtml();
    };
    $('#addsec').onclick = () => { syncCv(); cv.push({ title: 'Nova seção', items: [{ period: '', title: '', desc: '' }] }); $('#cv').innerHTML = cvHtml(); };
    $('#sv').onclick = async () => {
      const root = $('#tx'); SET.forEach(([, fl]) => fl.forEach(([k]) => { s[k] = $(`[data-k="${k}"]`, root).value.trim(); }));
      s.bio = $('[data-k="bio"]', root).value.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean); s.heroImages = hi.get(); s.aboutImages = ai.get();
      s.steps = $$('#steps .rw').map(r => ({ t: $('[data-s=t]', r).value.trim(), d: $('[data-s=d]', r).value.trim() }));
      s.nav.forEach((n, i) => { n.label = $(`[data-nl="${i}"]`).value.trim() || n.label; n.show = $(`[data-ns="${i}"]`).checked; }); syncCv();
      cv.forEach(sec => sec.items = sec.items.filter(it => it.title.trim() || it.desc.trim()));
      if (await save('settings') && await save('cv')) viewTextos();
    };
  }

  // --- Configurações
  function viewConfig() {
    const s = C.settings;
    shell('config', `<h1>Configurações</h1><p class="sub">Canais de contato, segurança e cópia de segurança.</p>
<fieldset><legend>Canais de contato</legend><p class="sm mut">Quanto mais canais, mais fácil para o cliente pedir. Só o Instagram é obrigatório.</p><div id="cc">${fieldHtml({ k: 'whatsapp', l: 'WhatsApp', h: '(com DDD, só números. Ex.: 5511999998888)' }, s.whatsapp, 'x')}${fieldHtml({ k: 'email', l: 'E-mail' }, s.email, 'x')}${fieldHtml({ k: 'handle', l: 'Usuário do Instagram', h: '(sem @)' }, s.handle, 'x')}${fieldHtml({ k: 'instagram', l: 'Endereço do Instagram' }, s.instagram, 'x')}${fieldHtml({ k: 'name', l: 'Nome / marca' }, s.name, 'x')}</div><p><button class="btn" id="svc">Salvar</button></p></fieldset>
<fieldset><legend>Acesso ao painel</legend><div class="two"><label class="f"><span>E-mail de acesso</span><input id="pe" value="${esc(ME.email)}"></label><label class="f"><span>Senha atual</span><input id="pc" type="password" autocomplete="current-password"></label></div><label class="f"><span>Nova senha <small>(mínimo 8 caracteres)</small></span><input id="pn" type="password" autocomplete="new-password"></label><p><button class="btn" id="svp">Trocar senha</button></p></fieldset>
<fieldset><legend>Cópia de segurança</legend><p class="sm mut">Baixe um arquivo com todos os textos, itens e pedidos. O sistema também guarda automaticamente as últimas versões do conteúdo no servidor.</p><p><a class="btn ghost" href="/api/admin/backup">Baixar backup</a></p></fieldset>`);
    $('#svc').onclick = async () => { ['whatsapp', 'email', 'handle', 'instagram', 'name'].forEach(k => { s[k] = $(`#cc [data-k="${k}"]`).value.trim(); }); s.whatsapp = s.whatsapp.replace(/\D/g, ''); if (await save('settings')) viewConfig(); };
    $('#svp').onclick = async () => { try { await api('POST', '/api/admin/password', { email: $('#pe').value, current: $('#pc').value, password: $('#pn').value }); toast('Senha alterada ✓'); $('#pc').value = $('#pn').value = ''; } catch (e) { fail(e); } };
  }

  // ---------- roteamento
  async function render() {
    const r = (location.hash.replace('#/', '') || 'resumo').split('?')[0];
    try {
      if (!C) { C = await api('GET', '/api/admin/content'); }
      ME = Object.assign(ME || {}, await api('GET', '/api/admin/me'));
      ({ resumo: viewResumo, pedidos: viewPedidos, flash: viewFlash, catalogo: () => viewList('products', 'catalogo'), portfolio: () => viewList('projects', 'portfolio'), textos: viewTextos, config: viewConfig }[r] || viewResumo)();
    } catch (e) { fail(e); }
  }
  window.addEventListener('hashchange', render);
  async function start() { C = null; ME = null; try { ME = await api('GET', '/api/admin/me'); } catch (e) { return; } render(); }
  start();
})();
