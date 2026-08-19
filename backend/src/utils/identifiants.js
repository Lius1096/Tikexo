// Identifiants entreprise/commerçant béninois — IFU (DGI) et RCCM (OHADA).
//
// IFU : 13 chiffres exactement (décret DGI portant création de l'IFU).
// Saisi avec ou sans espaces/tirets de regroupement — on normalise vers la
// forme brute (13 chiffres collés), seule forme stable pour l'unicité en base.
//
// RCCM : nomenclature OHADA — Pays/Tribunal/Année(2 chiffres) Forme(A-D) N°.
// Ex. officiels : "RB/COT/01 A 2315", "RB/ABOMEY/05 B 0036", "RB/ABC/23 B 7460".
// Le pays est noté "RB" (République du Bénin) en usage local, parfois "BJ"
// (code OHADA international) — les deux sont acceptés. Séparateurs (slash,
// espace, ou aucun) volontairement tolérés en entrée, normalisés en sortie.

function normaliserIfu(ifu) {
  if (!ifu || typeof ifu !== 'string') return ifu;
  return ifu.replace(/[\s-]/g, '');
}

function validerIfu(ifu) {
  const norm = normaliserIfu(ifu);
  return /^\d{13}$/.test(norm);
}

function normaliserRccm(rccm) {
  if (!rccm || typeof rccm !== 'string') return rccm;
  const clean = rccm.trim().toUpperCase().replace(/\s+/g, ' ');
  const m = clean.match(/^(RB|BJ)[/ ]?([A-Z-]{2,15})[/ ]?(\d{2})[/ ]?([A-D])[/ ]?(\d{3,7})$/);
  if (!m) return clean;
  const [, pays, tribunal, annee, forme, numero] = m;
  return `${pays}/${tribunal}/${annee} ${forme} ${numero}`;
}

function validerRccm(rccm) {
  const norm = normaliserRccm(rccm);
  return /^(RB|BJ)\/[A-Z-]{2,15}\/\d{2} [A-D] \d{3,7}$/.test(norm);
}

module.exports = { normaliserIfu, validerIfu, normaliserRccm, validerRccm };
