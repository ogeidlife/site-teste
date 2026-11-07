(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  document.documentElement.classList.add('js');

  // ---- menu mobile
  var b = $('[data-burger]'), nav = $('#nav');
  if (b && nav) b.addEventListener('click', function () { var o = nav.classList.toggle('open'); b.setAttribute('aria-expanded', o); });

  // ---- flash: filtros e "mostrar mais"
  var grid = $('[data-grid]');
  if (grid) {
    var cards = $$('.fcard', grid), ff = $('[data-filters]'), E = ff.elements, more = $('[data-more]'), STEP = 60, shown = STEP, match = [];
    var digits = function (s) { return (s || '').replace(/\D/g, ''); };
    var apply = function (reset) {
      if (reset) shown = STEP;
      var raw = E.q.value.trim().toLowerCase(), q = digits(raw);
      match = cards.filter(function (c) {
        var code = c.dataset.c.toLowerCase();
        var okQ = !raw || (q ? digits(code).indexOf(q) > -1 : code.indexOf(raw) > -1);
        return okQ && (!E.cat.value || c.dataset.k === E.cat.value) && (!E.status || !E.status.value || c.dataset.s === E.status.value);
      });
      cards.forEach(function (c) { c.hidden = true; });
      match.slice(0, shown).forEach(function (c) { c.hidden = false; });
      $('.count').textContent = match.length + (match.length === 1 ? ' desenho' : ' desenhos');
      more.hidden = match.length <= shown; $('[data-empty]').hidden = match.length > 0;
    };
    ff.addEventListener('input', function () { apply(true); }); ff.addEventListener('change', function () { apply(true); });
    $$('[data-clear]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); ff.reset(); apply(true); }); });
    more.addEventListener('click', function () { shown += STEP; apply(); });
    apply(true);
  }

  // ---- formulário: monta a mensagem e abre WhatsApp / e-mail / Instagram
  $$('form[data-order]').forEach(function (f) {
    var fixed = f.getAttribute('data-type'), radios = $$('input[name=tipo][type=radio]', f), qs = new URLSearchParams(location.search);
    function sync() {
      var t = fixed || (radios.filter(function (r) { return r.checked; })[0] || {}).value || 'tattoo';
      $$('[data-for]', f).forEach(function (el) { var on = el.getAttribute('data-for') === t; el.hidden = !on; $$('input,select,textarea', el).forEach(function (i) { i.disabled = !on; }); });
    }
    radios.forEach(function (r) { r.addEventListener('change', sync); });
    var t0 = qs.get('tipo'); if (t0) radios.forEach(function (r) { r.checked = r.value === t0; });
    var ref = qs.get('ref'); if (ref && f.elements.ref_tattoo) f.elements.ref_tattoo.value = ref;
    sync();

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = {}; new FormData(f).forEach(function (v, k) { d[k] = String(v).trim(); });
      var r = d.ref_tattoo || d.ref_produto || '';
      var msg = ['Olá! Vim pelo site.',
        d.tipo === 'tattoo' ? 'Quero tatuar' + (r ? ' o flash ' + r : '') : d.tipo === 'produto' ? 'Quero encomendar' + (r ? ': ' + r : '') : 'Contato',
        d.regiao ? 'Região: ' + d.regiao : '', d.tamanho ? 'Tamanho: ' + d.tamanho : '',
        d.msg ? 'Mensagem: ' + d.msg : '', 'Nome: ' + d.nome, d.contato ? 'Contato: ' + d.contato : ''].filter(Boolean).join('\n');
      var wa = f.getAttribute('data-wa'), mail = f.getAttribute('data-email'), ig = f.getAttribute('data-ig'), handle = f.getAttribute('data-handle');
      var done = $('[data-done]', f), txt = $('[data-donetext]', f), follow = $('[data-follow]', f), url, label;
      if (wa) { url = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(msg); label = 'Abrir WhatsApp'; }
      else if (mail) { url = 'mailto:' + mail + '?subject=' + encodeURIComponent('Solicitação pelo site') + '&body=' + encodeURIComponent(msg); label = 'Abrir e-mail'; }
      else { url = 'https://ig.me/m/' + handle; label = 'Abrir Instagram'; try { navigator.clipboard.writeText(msg).catch(function () { }); } catch (x) { } }
      txt.textContent = (wa || mail) ? 'Clique abaixo para enviar.' : 'Copiamos o texto da mensagem — cole na conversa do Instagram.';
      follow.innerHTML = ' <a class="btn sm" target="_blank" rel="noopener" href="' + url.replace(/"/g, '&quot;') + '">' + label + '</a>' +
        (wa || mail ? '' : ' <a class="btn sm ghost" target="_blank" rel="noopener" href="' + ig + '">Perfil</a>');
      var pre = document.createElement('textarea'); pre.readOnly = true; pre.rows = 5; pre.value = msg; pre.setAttribute('aria-label', 'Texto da mensagem'); follow.appendChild(pre);
      done.hidden = false; done.scrollIntoView({ block: 'nearest' });
    });
  });


  // ---- revelar ao rolar
  var rv = $$('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }); }, { rootMargin: '0px 0px -5% 0px' });
    rv.forEach(function (el) { io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });

  // ---- arquivo: filtros por ano e tipo (estado no # da URL)
  var ar = $('[data-archive]');
  if (ar) {
    var items = $$('.mi', ar), bar = $('[data-archive-bar]'), amore = $('[data-amore]'), S2 = 48, n = S2, st = { y: '', k: '' };
    function readHash() { (location.hash || '').slice(1).split('-').forEach(function (p) { if (/^\d{4}$/.test(p)) st.y = p; else if (p) st.k = p; }); }
    function paint() {
      $$('.chip', bar).forEach(function (c) { var isY = c.hasAttribute('data-y'); c.classList.toggle('on', (isY ? c.dataset.y === st.y : c.dataset.k === st.k)); });
      var m = items.filter(function (i) { return (!st.y || i.dataset.y === st.y) && (!st.k || i.dataset.k === st.k); });
      items.forEach(function (i) { i.hidden = true; }); m.slice(0, n).forEach(function (i) { i.hidden = false; i.classList.add('in'); });
      $('[data-acount]').textContent = m.length + (m.length === 1 ? ' imagem' : ' imagens'); amore.hidden = m.length <= n; $('[data-empty]').hidden = m.length > 0;
    }
    bar.addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (!c) return;
      if (c.hasAttribute('data-y')) st.y = c.dataset.y; else st.k = c.dataset.k;
      n = S2; var h = [st.y, st.k].filter(Boolean).join('-'); history.replaceState(null, '', h ? '#' + h : location.pathname); paint();
    });
    amore.addEventListener('click', function () { n += S2; paint(); });
    window.addEventListener('hashchange', function () { st = { y: '', k: '' }; readHash(); n = S2; paint(); });
    readHash(); paint();
  }

  // ---- lightbox
  var lb = $('#lb'); if (!lb) return;
  var img = $('img', lb), vid = $('video', lb), cap = $('.lb-cap', lb), req = $('.lb-req', lb), list = [], idx = 0, last = null;
  function show(i) {
    idx = (i + list.length) % list.length; var a = list[idx], v = a.getAttribute('data-video');
    cap.textContent = a.getAttribute('data-cap') || '';
    if (v) { img.hidden = true; vid.hidden = false; vid.src = v; vid.play().catch(function () { }); } else { vid.pause(); vid.hidden = true; vid.removeAttribute('src'); img.hidden = false; img.src = a.getAttribute('data-full'); }
    var th = a.querySelector('img'); img.alt = th ? th.alt : '';
    var code = a.getAttribute('data-code'); req.hidden = !code; if (code) req.href = 'contato.html?tipo=tattoo&ref=' + encodeURIComponent(code);
  }
  function open(a) {
    list = $$('a.zoom', a.closest('.gallery, [data-grid], [data-archive], .masonry') || document).filter(function (x) { return !x.closest('[hidden]'); });
    idx = Math.max(0, list.indexOf(a)); last = a; show(idx); lb.hidden = false; document.body.classList.add('noscroll'); $('.lb-x', lb).focus();
    $$('.lb-p,.lb-n', lb).forEach(function (x) { x.hidden = list.length < 2; });
  }
  function close() { lb.hidden = true; img.removeAttribute('src'); vid.pause(); vid.removeAttribute('src'); document.body.classList.remove('noscroll'); if (last) last.focus(); }
  document.addEventListener('click', function (e) { var a = e.target.closest('a.zoom'); if (a && !e.metaKey && !e.ctrlKey) { e.preventDefault(); open(a); } });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-x')) close(); if (e.target.classList.contains('lb-p')) show(idx - 1); if (e.target.classList.contains('lb-n')) show(idx + 1); });
  document.addEventListener('keydown', function (e) { if (lb.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });
})();
