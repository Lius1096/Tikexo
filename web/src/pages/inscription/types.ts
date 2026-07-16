export interface InscriptionData {
  entreprise: {
    nom: string;
    nif: string;
    rccm: string;
    secteur: string;
    adresse: string;
    ville: string;
    nb_salaries: string;
    dotation_max: string;
    montant_max_wallet: string;
  };
  admin: {
    prenom: string;
    nom: string;
    telephone: string;
    email_rh: string;
    mot_de_passe: string;
    confirmer_mot_de_passe: string;
  };
  cgu: boolean;
}

export const DEFAULT_DATA: InscriptionData = {
  entreprise: {
    nom: '', nif: '', rccm: '', secteur: '', adresse: '', ville: '',
    nb_salaries: '', dotation_max: '', montant_max_wallet: '',
  },
  admin: { prenom: '', nom: '', telephone: '', email_rh: '', mot_de_passe: '', confirmer_mot_de_passe: '' },
  cgu: false,
};

export interface PlanInfo {
  frais: number;
  plan: string;
  label: string;
}

export function calculerFraisGestion(nbStr: string): PlanInfo {
  const n = parseInt(nbStr, 10) || 0;
  if (n <= 0)   return { frais: 5000,      plan: 'PME_S', label: 'PME · S' };
  if (n <= 50)  return { frais: 5000,      plan: 'PME_S', label: 'PME · S' };
  if (n <= 200) return { frais: 25000,     plan: 'PME_M', label: 'PME · M' };
  if (n <= 500) return { frais: 200 * n,   plan: 'ETI',   label: 'ETI' };
  return              { frais: 350 * n,   plan: 'GE',    label: 'Grande Entreprise' };
}

export const PLAN_TIERS = [
  {
    plan: 'PME_S',
    label: 'PME · S',
    range: '1 – 50 salariés',
    frais: '5 000',
    features: ['Portail RH + app salariés', 'Dotations automatiques', '5 % côté salarié · 5 % côté commerçant', 'Support email'],
  },
  {
    plan: 'PME_M',
    label: 'PME · M',
    range: '51 – 200 salariés',
    frais: '25 000',
    features: ['Tout PME·S inclus', 'Gestion par niveaux hiérarchiques', 'Exports comptables + factures PDF', 'Support prioritaire'],
  },
  {
    plan: 'ETI',
    label: 'ETI',
    range: '201 – 500 salariés',
    frais: '200 × effectif',
    features: ['Tout PME·M inclus', 'Mutations inter-entreprises', 'KYB prioritaire', 'Account manager dédié'],
  },
  {
    plan: 'GE',
    label: 'Grande Entreprise',
    range: '501 salariés et +',
    frais: '350 × effectif',
    features: ['Tout ETI inclus', 'SLA contractuel', 'Intégrations SIRH sur mesure', 'Support 24/7 dédié'],
  },
];
