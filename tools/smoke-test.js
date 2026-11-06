'use strict';
// Teste rápido: sobe o servidor numa pasta temporária e confere site, pedidos, login e estatísticas.  Uso: node tools/smoke-test.js
const { spawn } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const PORT = 3900 + Math.floor(Math.random() * 90), B = 'http://localhost:' + PORT, data = fs.mkdtempSync(path.join(os.tmpdir(), 'ogeid-'));
const srv = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT, DATA_DIR: data, ADMIN_EMAIL: 'teste@ogeid.com', ADMIN_PASSWORD: 'senha-de-teste-1' }, stdio: 'ignore' });
let bad = 0; const ok = (c, m) => { console.log((c ? '  ok  ' : ' FALHA ') + m); if (!c) bad++; };
const J = { 'Content-Type': 'application/json' };
(async () => {
  for (let i = 0; i < 30; i++) { try { await fetch(B + '/health'); break; } catch (e) { await new Promise(r => setTimeout(r, 200)); } }
  for (const p of ['/', '/flash', '/flash/og-f-0001', '/catalogo', '/portfolio', '/sobre', '/contato', '/privacidade', '/sitemap.xml', '/painel']) { const r = await fetch(B + p); ok(r.status === 200, `${p} -> ${r.status}`); }
  ok((await fetch(B + '/nao-existe')).status === 404, '404 para página inexistente');
  ok((await fetch(B + '/agendar', { redirect: 'manual' })).status === 301, '/agendar redireciona');
  ok((await fetch(B + '/api/admin/content')).status === 401, 'API do painel exige login');
  const bad1 = await fetch(B + '/api/login', { method: 'POST', headers: J, body: JSON.stringify({ email: 'teste@ogeid.com', password: 'errada' }) }); ok(bad1.status === 401, 'senha errada é recusada');
  const lg = await fetch(B + '/api/login', { method: 'POST', headers: J, body: JSON.stringify({ email: 'teste@ogeid.com', password: 'senha-de-teste-1' }) }); ok(lg.status === 200, 'login');
  const ck = lg.headers.getSetCookie().map(c => c.split(';')[0]).join('; '), A = { ...J, Cookie: ck, 'X-Panel': '1' };
  const pe = await fetch(B + '/api/pedido', { method: 'POST', headers: J, body: JSON.stringify({ tipo: 'tattoo', ref: 'OG-F-0001', nome: 'Teste', contato: '@teste' }) }); ok(pe.status === 200, 'pedido enviado');
  const od = await (await fetch(B + '/api/admin/orders', { headers: A })).json(); ok(od.length === 1 && od[0].name === 'Teste', 'pedido aparece no painel');
  const t = await fetch(B + '/api/t', { method: 'POST', headers: { ...J, 'User-Agent': 'Mozilla/5.0 (X11; Linux) Firefox/120' }, body: JSON.stringify({ p: '/flash/og-f-0001', w: 1200 }) }); ok(t.status === 200, 'visita registrada');
  await new Promise(r => setTimeout(r, 300)); const st = await (await fetch(B + '/api/admin/stats?days=7', { headers: A })).json(); ok(st.views === 1, 'estatísticas contam a visita');
  const c = await (await fetch(B + '/api/admin/content', { headers: A })).json(); c.settings.tagline = 'Frase do teste';
  ok((await fetch(B + '/api/admin/content/settings', { method: 'PUT', headers: A, body: JSON.stringify({ value: c.settings }) })).status === 200, 'salvar texto no painel');
  ok((await (await fetch(B + '/')).text()).includes('Frase do teste'), 'alteração aparece no site na hora');
})().catch(e => { console.error(e); bad++; }).finally(() => { srv.kill(); fs.rmSync(data, { recursive: true, force: true }); console.log(bad ? `\n${bad} falha(s)` : '\nTudo certo.'); process.exit(bad ? 1 : 0); });
