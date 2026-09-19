// project/Validator.js
// Fase 1 traz a base do Validator: checagens estruturais e de referência que
// já dão pra fazer sem GuardSystem/TraversalSystem/MissionSystem ainda
// existirem. Cada fase futura só precisa REGISTRAR novas checagens aqui
// (registerCheck) — o fluxo de BUILD (seção 34) não muda.
//
// Resultado sempre no formato: { errors:[], warnings:[], infos:[], ok:bool }

const checks = [];

export function registerCheck(name, fn) {
  checks.push({ name, fn });
}

export function validateProject(project, { assetManager } = {}) {
  const result = { errors: [], warnings: [], infos: [] };

  const push = (level, message, context) => {
    result[level].push({ message, context: context || null });
  };

  // --- checagens estruturais básicas (sempre disponíveis) ---
  if (!project?.meta?.name) push("warnings", "Projeto sem nome definido (meta.name).");

  const interactionIds = new Set((project.interactions || []).map((i) => i.id));
  (project.entities || []).forEach((entity) => {
    (entity.interactions || []).forEach((interId) => {
      if (!interactionIds.has(interId)) {
        push("errors", `Entidade "${entity.id}" referencia a interação "${interId}", que não existe.`, { entity: entity.id, interId });
      }
    });
  });

  (project.interactions || []).forEach((inter) => {
    if (!inter.id) push("errors", "Existe uma interação sem id.");
    if (!inter.type) push("errors", `Interação "${inter.id}" sem "type" definido.`);
  });

  // --- checagens registradas por sistemas específicos (PaintInteraction, etc.) ---
  for (const { name, fn } of checks) {
    try {
      fn(project, { push, assetManager });
    } catch (err) {
      push("errors", `Checagem "${name}" falhou internamente: ${err.message}`);
    }
  }

  result.ok = result.errors.length === 0;
  return result;
}
