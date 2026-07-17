// Source unique des informations légales (éditeur / propriétaire / hébergeurs)
export const EDITEUR = {
  nom: 'KeTeVerse',
  forme_juridique: 'Micro-entreprise',
  pays: 'France',
  site: 'keteverse.com',
  adresse: 'À venir',
  siret: 'À venir',
  directeur_publication: 'À venir',
  contact: 'À venir',
} as const;

export const PROPRIETAIRE = {
  nom: 'DIGI HOME SERVICES',
  partenaire: 'KeTeVerse',
  adresse: 'À venir',
} as const;

export const HEBERGEURS = [
  { role: 'Application (API / backend)', nom: 'Render Services, Inc.', adresse: 'Oregon, États-Unis', site: 'render.com' },
  { role: 'Interface (frontend)',        nom: 'Vercel Inc.',           adresse: 'États-Unis',          site: 'vercel.com' },
  { role: 'Stockage des documents',      nom: 'Cloudflare, Inc. (R2)', adresse: 'États-Unis',          site: 'cloudflare.com' },
] as const;
