'use strict';
// Aplica os textos curatoriais de src/curatorial.js a um banco JÁ EXISTENTE (bancos novos já nascem com eles).
//   node tools/apply-curatorial.js            → só preenche campos VAZIOS (nunca sobrescreve o que você escreveu)
//   node tools/apply-curatorial.js --force    → sobrescreve os textos desses projetos (faça backup de data/ antes)
const D = require('../src/db'), CUR = require('../src/curatorial'), force = process.argv.includes('--force');
let upd = 0, skip = [];
for (const [slug, t] of Object.entries(CUR.texts)) {
  const p = D.q.get('SELECT id,summary,concept FROM projects WHERE slug=?', slug); if (!p) continue;
  const s = force || !p.summary ? t.summary : p.summary, c = force || !p.concept ? t.concept : p.concept;
  if (s !== p.summary || c !== p.concept) { D.q.run('UPDATE projects SET summary=?, concept=? WHERE id=?', s, c, p.id); upd++; } else skip.push(slug);
}
D.setSetting('curatorial_version', String(CUR.version));
console.log(`${upd} projeto(s) atualizado(s).` + (skip.length ? ` Mantidos (já tinham texto): ${skip.join(', ')}. Use --force para sobrescrever.` : ''));
