'use strict';
// Armazenamento em arquivos JSON (sem banco de dados, sem dependências).
const fs = require('fs'), path = require('path'), crypto = require('crypto');

module.exports = function (DATA, ROOT) {
  ['uploads/web', 'uploads/thumb', 'backups', 'analytics'].forEach(d => fs.mkdirSync(path.join(DATA, d), { recursive: true }));
  const f = n => path.join(DATA, n);
  const read = (n, def) => { try { return JSON.parse(fs.readFileSync(f(n), 'utf8')); } catch (e) { return def; } };
  const write = (n, v) => { const t = f(n) + '.tmp'; fs.writeFileSync(t, JSON.stringify(v)); fs.renameSync(t, f(n)); };

  // ---- conteúdo do site
  let content = read('content.json', null);
  if (!content) { content = JSON.parse(fs.readFileSync(path.join(ROOT, 'seed', 'content.json'), 'utf8')); write('content.json', content); }
  const SECTIONS = { settings: 'object', cv: 'array', flash: 'array', products: 'array', projects: 'array' };
  let lastBackup = 0;
  function backup() {
    if (Date.now() - lastBackup < 5 * 60e3) return; lastBackup = Date.now();
    try {
      fs.copyFileSync(f('content.json'), path.join(DATA, 'backups', 'content-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json'));
      const all = fs.readdirSync(path.join(DATA, 'backups')).sort();
      all.slice(0, Math.max(0, all.length - 40)).forEach(x => fs.unlinkSync(path.join(DATA, 'backups', x)));
    } catch (e) { }
  }
  function saveSection(name, value) {
    if (!SECTIONS[name]) throw new Error('seção inválida');
    if (SECTIONS[name] === 'array' ? !Array.isArray(value) : (typeof value !== 'object' || Array.isArray(value) || !value)) throw new Error('formato inválido');
    backup(); content[name] = value; write('content.json', content);
  }

  // ---- pedidos / mensagens
  let orders = read('orders.json', []);
  const saveOrders = () => write('orders.json', orders);

  // ---- usuário do painel
  const hash = (pw, salt) => crypto.scryptSync(String(pw), salt, 64).toString('hex');
  let user = read('users.json', null);
  function setPassword(email, pw) { const salt = crypto.randomBytes(16).toString('hex'); user = { email, salt, hash: hash(pw, salt) }; write('users.json', user); }
  let generated = null;
  if (!user) {
    const email = process.env.ADMIN_EMAIL || 'admin@ogeid.local';
    let pw = process.env.ADMIN_PASSWORD;
    if (!pw) { pw = crypto.randomBytes(6).toString('hex'); generated = { email, pw }; }
    setPassword(email, pw);
  }
  const checkLogin = (email, pw) => {
    if (!user || String(email).trim().toLowerCase() !== user.email.toLowerCase()) return false;
    const a = Buffer.from(hash(pw, user.salt), 'hex'), b = Buffer.from(user.hash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };

  // ---- segredo da sessão
  let secret; try { secret = fs.readFileSync(f('secret'), 'utf8'); } catch (e) { secret = crypto.randomBytes(32).toString('hex'); fs.writeFileSync(f('secret'), secret, { mode: 0o600 }); }

  return { DATA, get content() { return content; }, saveSection, get orders() { return orders; }, saveOrders, setPassword, checkLogin, get email() { return user.email; }, secret, generated, read, write };
};
