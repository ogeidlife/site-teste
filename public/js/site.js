(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  document.documentElement.classList.add('js');

  // ---- menu mobile
  var b = $('[data-burger]'), nav = $('#nav');
  if (b && nav) b.addEventListener('click', function () { var o = nav.classList.toggle('open'); b.setAttribute('aria-expanded', o); });

  // ---- estatísticas anônimas (sem cookies)
  function track(data) { data.p = location.pathname; data.w = innerWidth; try { var x = JSON.stringify(data); if (navigator.sendBeacon) navigator.sendBeacon('/api/t', new Blob([x], { type: 'application/json' })); else fetch('/api/t', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: x, keepalive: true }); } catch (e) { } }
  track({ r: document.referrer, u: new URLSearchParams(location.search).get('utm_source') || '' });
  document.addEventListener('click', function (e) { var t = e.target.closest('[data-ev]'); if (t) track({ e: t.getAttribute('data-ev') }); if (e.target.closest('[data-print]')) window.print(); });

  // ---- flash: filtros e "mostrar mais"
  var grid = $('[data-grid]');
  if (grid) {
    var cards = $$('.fcard', grid), ff = $('[data-filters]'), E = ff.elements, more = $('[data-more]'), STEP = 60, shown = STEP, match = [];
    var norm = function (s) { return (s || '').toLowerCase().replace(/\D/g, ''); };
    var apply = function (reset) {
      if (reset) shown = STEP;
      var q = norm(E.q.value), qt = E.q.value.trim().toLowerCase();
      match = cards.filter(function (c) { return (!q && !qt || (q ? c.dataset.c.toLowerCase().replace(/\D/g, '').indexOf(q) > -1 : c.dataset.c.toLowerCase().indexOf(qt) > -1)) && (!E.cat.value || c.dataset.k === E.cat.value) && (!E.status.value || c.dataset.s === E.status.value); });
      cards.forEach(function (c) { c.hidden = true; });
      match.slice(0, shown).forEach(function (c) { c.hidden = false; });
      $('.count').textContent = match.length + (match.length === 1 ? ' desenho' : ' desenhos');
      more.hidden = match.length <= shown; $('[data-empty]').hidden = match.length > 0;
    };
    ff.addEventListener('input', function () { apply(true); }); ff.addEventListener('change', function () { apply(true); });
    $('[data-clear]').addEventListener('click', function (e) { e.preventDefault(); ff.reset(); apply(true); });
    more.addEventListener('click', function () { shown += STEP; apply(); });
    apply(true);
  }

  // ---- formulário de pedido
  $$('form[data-order]').forEach(function (f) {
    var fixed = f.getAttribute('data-type'), radios = $$('input[name=tipo][type=radio]', f);
    function sync() {
      var t = fixed || (radios.filter(function (r) { return r.checked; })[0] || {}).value || 'tattoo';
      $$('[data-for]', f).forEach(function (el) { var on = el.getAttribute('data-for') === t; el.hidden = !on; $$('input,select,textarea', el).forEach(function (i) { i.disabled = !on; }); });
    }
    radios.forEach(function (r) { r.addEventListener('change', sync); });
    var def = f.getAttribute('data-default'), pre = new URLSearchParams(location.search);
    if (def) radios.forEach(function (r) { r.checked = r.value === def; });
    sync();
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('button[type=submit]', f), data = {}; new FormData(f).forEach(function (v, k) { data[k] = v; });
      btn.disabled = true; $('[data-fail]', f).hidden = true;
      fetch('/api/pedido', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function () {
          var ref = data.ref || data.ref_tattoo || data.ref_produto || '', lines = ['Olá! Acabei de enviar uma solicitação pelo site.', data.tipo === 'tattoo' ? 'Tatuagem' + (ref ? ' — ' + ref : '') : data.tipo === 'produto' ? 'Encomenda' + (ref ? ' — ' + ref : '') : 'Contato', data.regiao ? 'Região: ' + data.regiao : '', data.tamanho ? 'Tamanho: ' + data.tamanho : '', 'Nome: ' + data.nome].filter(Boolean).join('\n');
          var follow = $('[data-follow]', f), links = '', wa = document.querySelector('.foot a[href^="https://wa.me/"]');
          if (wa) links += ' <a class="btn sm" target="_blank" rel="noopener" data-ev="whatsapp" href="' + wa.href.split('?')[0] + '?text=' + encodeURIComponent(lines) + '">Agilizar pelo WhatsApp</a>';
          var ig = document.querySelector('.foot a[href*="instagram.com"]'); if (ig) links += ' <a class="btn sm ghost" target="_blank" rel="noopener" data-ev="instagram" href="' + ig.href + '">Abrir Instagram</a>';
          follow.innerHTML = links ? '<br>Quer agilizar?' + links : '';
          $('[data-done]', f).hidden = false; btn.hidden = true; $$('label,fieldset,.two', f).forEach(function (x) { x.hidden = true; });
        }).catch(function () { $('[data-fail]', f).hidden = false; btn.disabled = false; });
    });
  });

  // ---- lightbox
  var lb = $('#lb'); if (!lb) return;
  var img = $('img', lb), list = [], idx = 0, last = null;
  function show(i) { idx = (i + list.length) % list.length; img.src = list[idx].getAttribute('data-full'); var a = list[idx].querySelector('img'); img.alt = a ? a.alt : ''; }
  function open(a) { list = $$('a.zoom', a.closest('.gallery') || document); idx = Math.max(0, list.indexOf(a)); last = a; show(idx); lb.hidden = false; document.body.classList.add('noscroll'); $('.lb-x', lb).focus(); $$('.lb-p,.lb-n', lb).forEach(function (x) { x.hidden = list.length < 2; }); }
  function close() { lb.hidden = true; img.removeAttribute('src'); document.body.classList.remove('noscroll'); if (last) last.focus(); }
  document.addEventListener('click', function (e) { var a = e.target.closest('a.zoom'); if (a && !e.metaKey && !e.ctrlKey) { e.preventDefault(); open(a); } });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-x')) close(); if (e.target.classList.contains('lb-p')) show(idx - 1); if (e.target.classList.contains('lb-n')) show(idx + 1); });
  document.addEventListener('keydown', function (e) { if (lb.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });
})();
