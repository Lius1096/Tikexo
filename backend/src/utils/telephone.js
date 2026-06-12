// Utilitaire numéros béninois — transition 8 → 10 chiffres (2024)
// Ancien format : +229 XX XX XX XX  (8 chiffres après l'indicatif)
// Nouveau format : +229 01 XX XX XX XX  (10 chiffres après l'indicatif)

/**
 * Nettoie et normalise un numéro vers le format E164 béninois à 10 chiffres.
 * Accepte en entrée :
 *   - "+229 01 97 00 00 11"  → "+2290197000011"  (nouveau, déjà correct)
 *   - "+229 97 00 00 11"     → "+2290197000011"  (ancien → migration auto)
 *   - "01 97 00 00 11"       → "+2290197000011"  (national 10 chiffres)
 *   - "97 00 00 11"          → "+2290197000011"  (national 8 chiffres)
 */
function normaliserTelephone(tel) {
  if (!tel || typeof tel !== 'string') return tel;

  // Supprimer espaces, tirets, points, parenthèses
  const clean = tel.replace(/[\s\-().]/g, '');

  // E164 10 chiffres (nouveau format correct) : +229XXXXXXXXXX
  if (/^\+229\d{10}$/.test(clean)) return clean;

  // E164 8 chiffres (ancien format) : +229XXXXXXXX → ajouter 01
  if (/^\+229\d{8}$/.test(clean)) return `+22901${clean.slice(4)}`;

  // National 10 chiffres sans indicatif : 01XXXXXXXX ou autre
  if (/^\d{10}$/.test(clean)) return `+229${clean}`;

  // National 8 chiffres sans indicatif (ancien) : XXXXXXXX
  if (/^\d{8}$/.test(clean)) return `+22901${clean}`;

  // Retourner tel quel si format inconnu (évite de casser d'autres pays)
  return clean;
}

/**
 * Valide qu'un numéro est un numéro béninois valide (après normalisation).
 */
function validerTelephone(tel) {
  const norm = normaliserTelephone(tel);
  return /^\+229\d{10}$/.test(norm);
}

module.exports = { normaliserTelephone, validerTelephone };
