// Source unique des constantes RGPD — modifier ici met à jour toute l'appli
export const RGPD = {
  retention_donnees_personnelles_ans: 3,
  retention_donnees_financieres_ans: 10,
  contact_dpo: 'rgpd@tikexo.bj',
  contact_support: 'support@tikexo.bj',
  base_legale: 'Contrat (Art. 6(1)(b) RGPD) + Obligation légale (Art. 6(1)(c) RGPD)',
  reglementation_financiere: 'réglementation UEMOA / BCEAO — LCB-FT',
  version_cgu: '17 juillet 2026',
} as const;

export const texteRetentionPersonnelles = `${RGPD.retention_donnees_personnelles_ans} ans après clôture du compte`;
export const texteRetentionFinancieres  = `${RGPD.retention_donnees_financieres_ans} ans (${RGPD.reglementation_financiere})`;
