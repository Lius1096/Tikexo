// Miroir de web/src/utils/rgpd.ts — source unique des constantes RGPD.
export const RGPD = {
  retention_donnees_personnelles_ans: 3,
  retention_donnees_financieres_ans: 10,
  contact_dpo: 'rgpd@tikexo.bj',
  contact_support: 'support@tikexo.bj',
} as const;

export const texteRetentionPersonnelles = `${RGPD.retention_donnees_personnelles_ans} ans après clôture du compte`;
export const texteRetentionFinancieres = `${RGPD.retention_donnees_financieres_ans} ans (réglementation UEMOA / BCEAO — LCB-FT)`;
