// Miroir de web/src/lib/commercantConstants.ts — source unique des libellés
// commerçant, alignés sur les enums Prisma (schema.prisma).

export const TYPE_COMMERCANT_LABELS: Record<string, string> = {
  RESTAURANT: 'Restaurant',
  BOULANGERIE: 'Boulangerie',
  EPICERIE: 'Épicerie',
  TRAITEUR: 'Traiteur',
  CAFETERIA: 'Cafétéria',
  LIVRAISON: 'Livraison',
  SUPERMARCHE: 'Supermarché',
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  PIECE_IDENTITE_GERANT: "Pièce d'identité du gérant",
  JUSTIFICATIF_IFU: 'Justificatif IFU',
};
