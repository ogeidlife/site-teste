'use strict';
// uso: node tools/create-admin.js email@dominio.com "senha-com-10+-caracteres"   (cria ou redefine a senha)
const D = require('../src/db'), L = require('../src/lib');
const [email, pw] = [(process.argv[2] || '').trim().toLowerCase(), process.argv[3] || ''];
if (!email || pw.length < 10) { console.error('uso: node tools/create-admin.js email "senha-com-10+-caracteres"'); process.exit(1); }
const u = D.q.get('SELECT id FROM users WHERE email=?', email);
if (u) D.q.run('UPDATE users SET pass_hash=? WHERE id=?', L.hashPw(pw), u.id); else D.q.run('INSERT INTO users(email,pass_hash) VALUES(?,?)', email, L.hashPw(pw));
console.log(u ? 'Senha redefinida para' : 'Administrador criado:', email);
