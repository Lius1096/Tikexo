export type Plan = 'Starter' | 'Growth' | 'Business';
export type Operateur = 'MTN' | 'MOOV' | 'CELTIS';

export interface InscriptionData {
  entreprise: {
    nom: string;
    nif: string;
    rccm: string;
    secteur: string;
    adresse: string;
    ville: string;
    nb_salaries: string;
  };
  admin: {
    prenom: string;
    nom: string;
    telephone: string;
    email_rh: string;
  };
  plan: Plan;
  cgu: boolean;
  recharge: {
    montant: string;
    operateur: Operateur | null;
  };
}

export const DEFAULT_DATA: InscriptionData = {
  entreprise: { nom: '', nif: '', rccm: '', secteur: '', adresse: '', ville: '', nb_salaries: '' },
  admin: { prenom: '', nom: '', telephone: '', email_rh: '' },
  plan: 'Growth',
  cgu: false,
  recharge: { montant: '', operateur: 'MTN' },
};

export const PLANS: Record<Plan, { prix: number; commission: string; salaries: string; populaire?: boolean }> = {
  Starter:  { prix: 15000, commission: '2% / transaction',   salaries: '1–20 salariés' },
  Growth:   { prix: 35000, commission: '1,8% / transaction', salaries: '21–100 salariés', populaire: true },
  Business: { prix: 75000, commission: '1,5% / transaction', salaries: '101–300 salariés' },
};

export const PLAN_FEATURES: Record<Plan, string[]> = {
  Starter: ['Portail RH web + app mobile', 'Dotations automatiques', '2% commission / transaction', 'Support email'],
  Growth:  ['Portail RH web + app mobile', 'Gestion niveaux hiérarchiques', 'Dotations automatiques CSV', 'Exports comptables mensuels', 'Factures PDF automatiques', '1,8% commission / transaction'],
  Business:['Tout Growth inclus', 'Mutations inter-entreprises', 'KYC entreprise prioritaire', '1,5% commission + support dédié'],
};
