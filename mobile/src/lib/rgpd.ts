// Miroir de web/src/utils/rgpd.ts — source unique des constantes RGPD.
export const RGPD = {
  retention_donnees_personnelles_ans: 3,
  retention_donnees_financieres_ans: 10,
  contact_dpo: 'support@tikexo.kete.fr',
  contact_support: 'support@tikexo.kete.fr',
} as const;

export const texteRetentionPersonnelles = `${RGPD.retention_donnees_personnelles_ans} ans après clôture du compte`;
export const texteRetentionFinancieres = `${RGPD.retention_donnees_financieres_ans} ans (réglementation UEMOA / BCEAO, LCB-FT)`;
