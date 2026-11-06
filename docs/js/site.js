(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  // menu mobile
  var b = $('[data-burger]'), nav = $('#nav');
  if (b && nav) b.addEventListener('click', function () { var o = nav.classList.toggle('open'); b.setAttribute('aria-expanded', o); });
  // confirmações e impressão (sem JS inline, por causa da CSP)
  document.addEventListener('submit', function (e) { var m = e.target.getAttribute('data-confirm'); if (m && !confirm(m)) e.preventDefault(); });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-confirm]'); if (t && t.tagName !== 'FORM' && !confirm(t.getAttribute('data-confirm'))) { e.preventDefault(); return; }
    if (e.target.closest('[data-print]')) window.print();
  });
  var all = $('[data-all]'); if (all) all.addEventListener('change', function () { $$('input[name=ids]').forEach(function (c) { c.checked = all.checked; }); });
  // ===== versão estática (GitHub Pages): filtros no navegador e mensagens de contato =====
  if (document.body.hasAttribute('data-static')) {
    var ta = $$('[data-contact] textarea'); var fp = new URLSearchParams(location.search).get('flash');
    ta.forEach(function (t) { t.value = t.value.split('{flash}').join(fp || '(tatuagem personalizada, sem flash)'); });
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-send]'); if (!b) return;
      var box = b.closest('[data-contact]'), msg = $('textarea', box).value, k = b.getAttribute('data-send');
      if (k === 'wa') b.href = 'https://wa.me/' + b.getAttribute('data-num') + '?text=' + encodeURIComponent(msg);
      if (k === 'mail') b.href = 'mailto:' + b.getAttribute('data-to') + '?subject=' + encodeURIComponent(b.getAttribute('data-subject')) + '&body=' + encodeURIComponent(msg);
      if (k === 'ig') { try { navigator.clipboard.writeText(msg); } catch (x) { var t = $('textarea', box); t.select(); document.execCommand('copy'); } var n = $('[data-copied]', box); if (n) n.hidden = false; }
    });
    var ff = $('form.filters'), cards = $$('.fgrid .fcard[data-code]');
    if (ff && cards.length) {
      var norm = function (s) { return (s || '').toLowerCase(); }, money = function (s) { s = (s || '').replace(/[^\d,.]/g, ''); if (!s) return null; return Math.round(parseFloat(s.replace(/\./g, '').replace(',', '.')) * 100); };
      var apply = function () {
        var v = function (n) { var el = ff.elements[n]; return el ? el.value : ''; }, q = norm(v('q')), pmin = money(v('pmin')), pmax = money(v('pmax')), n = 0;
        cards.forEach(function (c) {
          var d = c.dataset, price = d.price === '' ? null : Number(d.price);
          var ok = (!q || norm(d.code + ' ' + d.title).indexOf(q) > -1) && (!v('cat') || d.cat === v('cat')) && (!v('estilo') || d.style === v('estilo')) && (!v('tamanho') || d.size === v('tamanho')) && (!v('status') || d.status === v('status')) && (pmin == null || (price != null && price >= pmin)) && (pmax == null || (price != null && price <= pmax));
          c.hidden = !ok; if (ok) n++;
        });
        var ct = $('.count'); if (ct) ct.textContent = n + (n === 1 ? ' desenho' : ' desenhos');
      };
      ff.addEventListener('submit', function (e) { e.preventDefault(); apply(); });
      ff.addEventListener('input', apply); ff.addEventListener('change', apply);
      var clr = $('a.link', ff); if (clr) clr.addEventListener('click', function (e) { e.preventDefault(); ff.reset(); apply(); });
    }
  }
  // lightbox acessível
  var lb = $('#lb'); if (!lb) return;
  var img = $('img', lb), list = [], idx = 0, last = null;
  function show(i) { idx = (i + list.length) % list.length; img.src = list[idx].getAttribute('data-full'); var a = list[idx].querySelector('img'); img.alt = a ? a.alt : ''; }
  function open(a) { list = $$('a.zoom', a.closest('.gallery, .d-img') || document); idx = Math.max(0, list.indexOf(a)); last = a; show(idx); lb.hidden = false; document.body.classList.add('noscroll'); $('.lb-x', lb).focus(); $$('.lb-p,.lb-n', lb).forEach(function (x) { x.hidden = list.length < 2; }); }
  function close() { lb.hidden = true; img.removeAttribute('src'); document.body.classList.remove('noscroll'); if (last) last.focus(); }
  document.addEventListener('click', function (e) { var a = e.target.closest('a.zoom'); if (a && !e.metaKey && !e.ctrlKey) { e.preventDefault(); open(a); } });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-x')) close(); if (e.target.classList.contains('lb-p')) show(idx - 1); if (e.target.classList.contains('lb-n')) show(idx + 1); });
  document.addEventListener('keydown', function (e) { if (lb.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });
})();
