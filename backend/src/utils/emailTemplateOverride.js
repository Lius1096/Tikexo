// Personnalisation admin des emails transactionnels, sans déploiement.
// Principe : tant qu'aucune ligne EmailTemplate n'existe pour une `cle`
// donnée, le code utilise son modèle par défaut codé en dur (les fonctions
// de emailTemplates.js, inchangées) — aucune régression possible si
// l'admin n'a rien personnalisé.
//
// L'admin ne voit ni n'écrit jamais de HTML : il tape un message en texte
// normal (comme un email classique, lignes vides entre les paragraphes),
// habillé automatiquement dans le même gabarit de marque TIKEXO
// (logo, couleurs, pied de page) que tous les autres emails.
const prisma = require('../config/database');
const { layout } = require('./emailTemplates');
const { texteVersHtml } = require('./texteEmail');

const CLES_VALIDES = ['BIENVENUE_ENTREPRISE', 'KYB_REJETE', 'KYB_APPROUVE'];

function interpoler(texte, variables) {
  return texte.replace(/\{\{(\w+)\}\}/g, (_, cle) => (variables[cle] !== undefined && variables[cle] !== null ? String(variables[cle]) : ''));
}

// `genererParDefaut` doit retourner { subject, html, text } — le modèle
// codé en dur, utilisé tel quel si aucune personnalisation n'existe.
async function rendreEmail(cle, variables, genererParDefaut) {
  const override = await prisma.emailTemplate.findUnique({ where: { cle } });
  if (!override) return genererParDefaut();

  const subject = interpoler(override.sujet, variables);
  const message = interpoler(override.corps, variables);
  const html = layout({ titre: subject, corps: texteVersHtml(message) });

  return { subject, html, text: message };
}

module.exports = { rendreEmail, interpoler, CLES_VALIDES };
