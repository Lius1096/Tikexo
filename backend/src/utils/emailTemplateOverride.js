// Personnalisation admin des emails transactionnels, sans déploiement.
// Principe : tant qu'aucune ligne EmailTemplate n'existe pour une `cle`
// donnée, le code utilise son modèle par défaut codé en dur (les fonctions
// de emailTemplates.js, inchangées) — aucune régression possible si
// l'admin n'a rien personnalisé.
const prisma = require('../config/database');

const CLES_VALIDES = ['BIENVENUE_ENTREPRISE', 'KYB_REJETE', 'KYB_APPROUVE'];

function interpoler(texte, variables) {
  return texte.replace(/\{\{(\w+)\}\}/g, (_, cle) => (variables[cle] !== undefined && variables[cle] !== null ? String(variables[cle]) : ''));
}

// `genererParDefaut` doit retourner { subject, html, text } — le modèle
// codé en dur, utilisé tel quel si aucune personnalisation n'existe.
async function rendreEmail(cle, variables, genererParDefaut) {
  const override = await prisma.emailTemplate.findUnique({ where: { cle } });
  if (!override) return genererParDefaut();

  return {
    subject: interpoler(override.sujet, variables),
    html: interpoler(override.corps_html, variables),
    text: interpoler(override.corps_texte, variables),
  };
}

module.exports = { rendreEmail, interpoler, CLES_VALIDES };
