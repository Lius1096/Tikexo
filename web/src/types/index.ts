// Types partagés TIKEXO — source unique de vérité pour les données API

export interface Entreprise {
  id: string;
  nom: string;
  secteur: string;
  ville: string;
  statut: 'ACTIVE' | 'SUSPENDUE' | 'ARCHIVEE';
  kyb_statut: 'EN_ATTENTE' | 'VALIDE' | 'REJETE';
  createdAt: string;
}

export interface Wallet {
  id: string;
  solde: number;
  currency: string;
  statut: 'ACTIF' | 'BLOQUE' | 'SUSPENDU';
}

export interface User {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  role: string;
  statut: string;
  kyc_niveau: string;
  wallet?: Wallet;
}

export interface Transaction {
  id: string;
  type: string;
  montant: number;
  statut: string;
  description?: string;
  createdAt: string;
  beneficiaire?: Pick<User, 'id' | 'nom' | 'prenom'>;
  commercant?: { id: string; nom: string };
}

export interface LedgerEntry {
  id: string;
  wallet_id: string;
  type: string;
  montant: number;
  solde_apres: number;
  reference?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardStats {
  total_entreprises: number;
  total_beneficiaires: number;
  total_commercants: number;
  volume_transactions_30j: number;
  revenus_30j: number;
  mutations_en_attente: number;
  alertes_fraude: number;
}

export interface AuditEntry {
  id: string;
  action: string;
  entite: string;
  entite_id?: string;
  createdAt: string;
  user?: Pick<User, 'id' | 'nom' | 'prenom' | 'role'>;
  avant?: unknown;
  apres?: unknown;
}

export interface CarteDigi {
  id: string;
  numero_masque: string;
  statut: 'ACTIVE' | 'BLOQUEE' | 'EXPIREE';
  createdAt: string;
  expiration_at?: string;
}

export interface Mutation {
  id: string;
  statut: string;
  option_solde: string;
  montant_rembourse?: number;
  createdAt: string;
  user: Pick<User, 'id' | 'nom' | 'prenom' | 'telephone'>;
  entrepriseA?: Pick<Entreprise, 'id' | 'nom'>;
  entrepriseB?: Pick<Entreprise, 'id' | 'nom'>;
}

export interface Dotation {
  id: string;
  montant: number;
  periodicite: string;
  statut: string;
  createdAt: string;
  beneficiaire: Pick<User, 'id' | 'nom' | 'prenom'>;
}

export interface Pagination {
  page: number;
  totalPages: number;
  total: number;
}

export interface ApiListResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}
