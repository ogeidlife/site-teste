'use strict';
// Estatísticas próprias (sem cookies, sem guardar IP). Um evento por linha em analytics/AAAA-MM.jsonl
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const TZ = (process.env.TZ_OFFSET !== undefined ? +process.env.TZ_OFFSET : -3) * 3600e3; // horário de Brasília por padrão
const day = ts => new Date(ts + TZ).toISOString().slice(0, 10);
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|node-fetch|axios/i;

module.exports = function (DATA, secret) {
  const dir = path.join(DATA, 'analytics');
  const saltFor = d => crypto.createHash('sha256').update(secret + d).digest('hex');
  const device = (w, ua) => /ipad|tablet/i.test(ua) ? 'tablet' : /mobi|android|iphone/i.test(ua) ? 'celular' : (w && w < 700 ? 'celular' : 'computador');

  function record(kind, req, body, ip) {
    const ua = String(req.headers['user-agent'] || '');
    if (!ua || BOT.test(ua)) return false;
    const now = Date.now(), d = day(now);
    let p = String(body.p || '/').split('?')[0].slice(0, 200); if (p[0] !== '/') p = '/' + p;
    if (p.length > 1) p = p.replace(/\/+$/, '');
    let ref = ''; try { ref = new URL(body.r).hostname.replace(/^(www|l|m|lm)\./, ''); } catch (e) { }
    if (ref && ref === String(req.headers.host || '').split(':')[0].replace(/^www\./, '')) ref = '';
    const ev = { t: now, k: kind, p, v: crypto.createHash('sha256').update(saltFor(d) + ip + ua).digest('hex').slice(0, 10), d: device(+body.w, ua) };
    if (kind === 'v') { ev.r = ref || (body.u ? 'utm:' + String(body.u).slice(0, 40) : ''); }
    else ev.e = String(body.e || '').slice(0, 30);
    fs.appendFile(path.join(dir, d.slice(0, 7) + '.jsonl'), JSON.stringify(ev) + '\n', () => { });
    return true;
  }

  function events(from, to) {
    const out = [], months = new Set();
    for (let t = from; t <= to + 31 * 864e5; t += 28 * 864e5) { const m = day(Math.min(t, to)).slice(0, 7); months.add(m); }
    months.forEach(m => {
      let txt = ''; try { txt = fs.readFileSync(path.join(dir, m + '.jsonl'), 'utf8'); } catch (e) { return; }
      txt.split('\n').forEach(l => { if (!l) return; try { const e = JSON.parse(l); if (e.t >= from && e.t <= to) out.push(e); } catch (x) { } });
    });
    return out;
  }

  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

  function summary(days) {
    days = Math.min(Math.max(+days || 30, 1), 365);
    const now = Date.now(), from = now - (days - 1) * 864e5, start = new Date(day(from) + 'T00:00:00Z').getTime() - TZ;
    const ev = events(start, now);
    const series = {}; for (let i = 0; i < days; i++) series[day(now - (days - 1 - i) * 864e5)] = { d: day(now - (days - 1 - i) * 864e5), views: 0, vis: new Set() };
    const pages = new Map(), pageVis = new Map(), refs = new Map(), devs = new Map(), evs = new Map(), hours = Array(24).fill(0);
    let views = 0; const vis = new Set();
    ev.forEach(e => {
      const d = day(e.t);
      if (e.k === 'v') {
        views++; vis.add(d + e.v); const s = series[d]; if (s) { s.views++; s.vis.add(e.v); }
        pages.set(e.p, (pages.get(e.p) || 0) + 1);
        refs.set(e.r || 'Direto', (refs.get(e.r || 'Direto') || 0) + 1);
        devs.set(e.d, (devs.get(e.d) || 0) + 1);
        hours[new Date(e.t + TZ).getUTCHours()]++;
        if (!pageVis.has(e.p)) pageVis.set(e.p, new Set()); pageVis.get(e.p).add(e.v + d);
      } else evs.set(e.e, (evs.get(e.e) || 0) + 1);
    });
    return {
      days, views, visitors: vis.size,
      series: Object.values(series).map(s => ({ d: s.d, views: s.views, visitors: s.vis.size })),
      pages: [...pages.entries()].sort((a, b) => b[1] - a[1]).map(([p, v]) => ({ path: p, views: v, visitors: pageVis.get(p).size })),
      refs: top(refs, 10), devices: top(devs, 5), events: Object.fromEntries(evs), hours,
    };
  }
  return { record, summary };
};
