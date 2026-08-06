// Constantes partagées commerçant — source unique pour l'admin (Commercants.tsx)
// et l'espace commerçant (commercant/*.tsx). Avant ce fichier, chaque page avait
// sa propre copie de ces libellés/enums, désynchronisée de ce que le backend
// renvoie réellement (cf. backend/prisma/schema.prisma).

// enum TypeCommercant (schema.prisma)
export const TYPE_COMMERCANT_LABELS: Record<string, string> = {
  RESTAURANT: 'Restaurant',
  BOULANGERIE: 'Boulangerie',
  EPICERIE: 'Épicerie',
  TRAITEUR: 'Traiteur',
  CAFETERIA: 'Cafétéria',
  LIVRAISON: 'Livraison',
  SUPERMARCHE: 'Supermarché',
};

// enum StatutCommercant (schema.prisma) — SOUMIS -> VALIDE -> ACTIF, + SUSPENDU/ARCHIVE
export const STATUT_COMMERCANT: Record<string, { label: string; cls: string }> = {
  SOUMIS:   { label: 'En attente',  cls: 'bg-amber-50 text-amber-700' },
  VALIDE:   { label: 'Validé',      cls: 'bg-blue-50 text-blue-700' },
  ACTIF:    { label: 'Actif',       cls: 'bg-emerald-50 text-emerald-700' },
  SUSPENDU: { label: 'Suspendu',    cls: 'bg-red-50 text-red-700' },
  ARCHIVE:  { label: 'Archivé',     cls: 'bg-slate-100 text-slate-500' },
};

// enum NiveauCommercant (schema.prisma)
export const NIVEAU_COMMERCANT: Record<string, { label: string; cls: string }> = {
  SIMPLIFIE: { label: 'Simplifié', cls: 'bg-slate-100 text-slate-600' },
  VERIFIE:   { label: 'Vérifié',   cls: 'bg-emerald-50 text-emerald-700' },
};

// enum StatutFedapay (schema.prisma) — pas de VALIDE ni REMBOURSE, seulement
// EN_ATTENTE/APPROUVE/ECHOUE.
export const PAYOUT_STATUT: Record<string, { label: string; cls: string }> = {
  EN_ATTENTE: { label: 'En attente', cls: 'bg-amber-50 text-amber-700' },
  APPROUVE:   { label: 'Traité',     cls: 'bg-emerald-50 text-emerald-700' },
  ECHOUE:     { label: 'Échoué',     cls: 'bg-red-50 text-red-700' },
};

// enum TypeCommercantDocument (schema.prisma)
export const DOC_TYPE_LABELS: Record<string, string> = {
  PIECE_IDENTITE_GERANT: "Pièce d'identité du gérant",
  JUSTIFICATIF_IFU: 'Justificatif IFU',
};

// enum StatutKybDocument (réutilisé pour CommercantDocument.statut)
export const DOC_STATUT: Record<string, { label: string; cls: string }> = {
  EN_ATTENTE: { label: 'En attente', cls: 'bg-amber-50 text-amber-700' },
  VALIDE:     { label: 'Validé',     cls: 'bg-emerald-50 text-emerald-700' },
  REJETE:     { label: 'Rejeté',     cls: 'bg-red-50 text-red-700' },
};
