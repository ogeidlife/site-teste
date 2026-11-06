'use strict';
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const { q, DATA } = require('./db');

// ---------- templating com escape automático ----------
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const raw = s => new Raw(s == null ? '' : String(s));
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const html = (strs, ...vals) => raw(strs.reduce((o, s, i) => {
  let v = vals[i - 1];
  if (Array.isArray(v)) v = v.map(x => x instanceof Raw ? x.s : esc(x)).join('');
  else if (v instanceof Raw) v = v.s; else v = esc(v);
  return o + v + s;
}));

// ---------- formatação ----------
const brl = c => c == null ? null : (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const parseMoney = s => {
  s = String(s ?? '').trim(); if (!s) return null;
  s = s.replace(/[^\d,.-]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};
const moneyInput = c => c == null ? '' : (c / 100).toFixed(2).replace('.', ',');
const fmtDate = s => { try { return new Date(s.replace(' ', 'T') + 'Z').toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }); } catch { return s; } };
const nl2p = t => raw(String(t || '').split(/\n{2,}/).filter(x => x.trim()).map(p => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join(''));
const jparse = (s, d = []) => { try { return JSON.parse(s) || d; } catch { return d; } };

// ---------- request helpers ----------
const MAX_BODY = 30 * 1024 * 1024;
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > MAX_BODY) { reject(Object.assign(new Error('Arquivo muito grande'), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function parseMultipart(buf, boundary) {
  const fields = {}, files = [];
  const sep = Buffer.from('--' + boundary); let pos = buf.indexOf(sep);
  while (pos !== -1) {
    const next = buf.indexOf(sep, pos + sep.length); if (next === -1) break;
    const part = buf.subarray(pos + sep.length + 2, next - 2);
    const he = part.indexOf('\r\n\r\n'); if (he === -1) { pos = next; continue; }
    const head = part.subarray(0, he).toString('utf8'), body = part.subarray(he + 4);
    const name = /name="([^"]*)"/.exec(head)?.[1], fn = /filename="([^"]*)"/.exec(head)?.[1];
    if (fn !== undefined) { if (fn) files.push({ field: name, filename: fn, data: body, type: /Content-Type:\s*([^\r\n]+)/i.exec(head)?.[1] || '' }); }
    else if (name) { if (name in fields) fields[name] = [].concat(fields[name], body.toString('utf8')); else fields[name] = body.toString('utf8'); }
    pos = next;
  }
  return { fields, files };
}
async function parseRequest(req) {
  const ct = req.headers['content-type'] || '';
  if (!['POST', 'PUT'].includes(req.method)) return { fields: {}, files: [] };
  const buf = await readBody(req);
  if (ct.startsWith('multipart/form-data')) return parseMultipart(buf, /boundary=(.+)$/.exec(ct)[1].replace(/^"|"$/g, ''));
  const f = {}; for (const [k, v] of new URLSearchParams(buf.toString('utf8'))) f[k] = k in f ? [].concat(f[k], v) : v;
  return { fields: f, files: [] };
}
const parseCookies = h => Object.fromEntries((h || '').split(';').map(c => c.trim().split('=')).filter(a => a[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));

// ---------- upload de imagens ----------
let sharp = null; try { sharp = require('sharp'); } catch { /* opcional: npm i sharp gera miniaturas automaticamente */ }
const IMG_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
function sniff(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf.subarray(1, 4).toString() === 'PNG') return 'png';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  if (buf.subarray(0, 3).toString() === 'GIF') return 'gif';
  return null;
}
async function saveImage(file, sub = 'images') {
  const kind = sniff(file.data); if (!kind) throw new Error('Formato de imagem não suportado (use JPG, PNG, WEBP ou GIF).');
  const dir = path.join(DATA, 'uploads', sub); fs.mkdirSync(dir, { recursive: true });
  const id = crypto.randomBytes(8).toString('hex'); let web = `${id}.${kind}`, thumb = web;
  if (sharp && kind !== 'gif') {
    web = `${id}.webp`; thumb = `${id}-t.webp`;
    await sharp(file.data).rotate().resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toFile(path.join(dir, web));
    await sharp(file.data).rotate().resize(560, 560, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(dir, thumb));
  } else fs.writeFileSync(path.join(dir, web), file.data);
  return { web: `/uploads/${sub}/${web}`, thumb: `/uploads/${sub}/${thumb}` };
}

// ---------- senhas e sessões ----------
const hashPw = (pw, salt = crypto.randomBytes(16).toString('hex')) => `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
const checkPw = (pw, stored) => { const [salt, h] = stored.split(':'); const t = crypto.scryptSync(pw, salt, 64); const b = Buffer.from(h, 'hex'); return b.length === t.length && crypto.timingSafeEqual(t, b); };
const SESSION_MS = 1000 * 60 * 60 * 12;
function newSession(userId) {
  const token = crypto.randomBytes(32).toString('hex'), csrf = crypto.randomBytes(16).toString('hex');
  q.run('DELETE FROM sessions WHERE expires<?', Date.now());
  q.run('INSERT INTO sessions(token,user_id,csrf,expires) VALUES(?,?,?,?)', token, userId, csrf, Date.now() + SESSION_MS);
  return token;
}
const getSession = req => {
  const t = parseCookies(req.headers.cookie).ogeid_sid; if (!t) return null;
  const s = q.get('SELECT s.token,s.csrf,s.expires,u.id uid,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?', t);
  return s && s.expires > Date.now() ? s : null;
};

// ---------- anti-spam / privacidade ----------
const SECRET = (() => {
  const f = path.join(DATA, '.secret');
  if (process.env.APP_SECRET) return process.env.APP_SECRET;
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  return fs.readFileSync(f, 'utf8');
})();
const hmac = s => crypto.createHmac('sha256', SECRET).update(s).digest('hex').slice(0, 24);
const formToken = () => { const t = Date.now(); return `${t}.${hmac('ft' + t)}`; };
function checkFormToken(tok, minMs = 3000, maxMs = 1000 * 60 * 60 * 6) {
  const [t, sig] = String(tok || '').split('.'); if (!t || sig !== hmac('ft' + t)) return false;
  const age = Date.now() - Number(t); return age >= minMs && age <= maxMs;
}
// IP nunca é guardado em claro. X-Forwarded-For só é confiável atrás de proxy/CDN (defina TRUST_PROXY=1).
const clientIp = req => (process.env.TRUST_PROXY === '1' && req.headers['x-forwarded-for']?.split(',')[0].trim()) || req.socket.remoteAddress;
const ipHash = req => hmac('ip' + clientIp(req));
const hits = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now(), arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return false; }
  arr.push(now); hits.set(key, arr); return true;
}
setInterval(() => { const now = Date.now(); for (const [k, a] of hits) if (!a.some(t => now - t < 3600e3)) hits.delete(k); }, 600e3).unref();

// ---------- notificações (estrutura pronta) ----------
// Sempre grava em data/outbox.log. Com NOTIFY_WEBHOOK_URL (ex.: Zapier/Make/n8n → e-mail/WhatsApp) também envia um POST JSON.
// Para SMTP/Resend/Mailgun, implemente sendEmail() abaixo (ponto único de integração).
async function sendEmail(/* { to, subject, text } */) { return false; }
async function notify(type, record, label) {
  const line = JSON.stringify({ at: new Date().toISOString(), type, label, id: record.id });
  try { fs.appendFileSync(path.join(DATA, 'outbox.log'), line + '\n'); } catch { }
  const to = process.env.NOTIFY_EMAIL_TO || require('./db').getSetting('email');
  if (to) sendEmail({ to, subject: `[OGEID] Nova ${type}: ${label}`, text: `Acesse o painel para ver os detalhes (#${record.id}).` }).catch(() => { });
  if (process.env.NOTIFY_WEBHOOK_URL) fetch(process.env.NOTIFY_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: line }).catch(() => { });
}

const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 160;
const clip = (s, n) => String(s ?? '').trim().slice(0, n);

module.exports = { hmac, raw, esc, html, brl, parseMoney, moneyInput, fmtDate, nl2p, jparse, parseRequest, parseCookies, saveImage, hashPw, checkPw,
  newSession, getSession, formToken, checkFormToken, ipHash, rateLimit, notify, validEmail, clip, SESSION_MS };
