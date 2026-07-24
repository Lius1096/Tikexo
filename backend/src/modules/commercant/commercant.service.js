// Service commerçant TIKEXO
const prisma = require('../../config/database');
const { genererQRCodeCommercant } = require('../../utils/qrcode');
const {
  calculerDistance,
  formaterDistance,
  estimerDureeAPied,
  estOuvertMaintenant,
  TIMEZONE_BENIN,
} = require('../../utils/geo');

const MAX_RESULTATS_NEARBY = 20;

async function lister(filtres = {}) {
  const { ville, type, q } = filtres;
  // statut vide/absent = tous les statuts (vue admin) ; sinon filtrer
  const statut = filtres.statut !== undefined && filtres.statut !== '' ? filtres.statut : null;
  const p = parseInt(filtres.page, 10) || 1;
  const l = parseInt(filtres.limit, 10) || 20;
  const where = {};
  if (statut) where.statut = statut;
  if (ville) where.ville = ville;
  if (type) where.type = type;
  if (q?.trim()) {
    where.OR = [
      { nom: { contains: q.trim(), mode: 'insensitive' } },
      { ifu: { contains: q.trim(), mode: 'insensitive' } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.commercant.count({ where }),
    prisma.commercant.findMany({
      where,
      select: {
        id: true, nom: true, type: true, niveau: true, adresse: true,
        ville: true, statut: true, note_moyenne: true, photo_url: true,
        qr_code_url: true, latitude: true, longitude: true,
      },
      skip: (p - 1) * l,
      take: l,
    }),
  ]);

  return { items, total, page: p, totalPages: Math.ceil(total / l) };
}

async function creer(data, creePar) {
  const user = await prisma.user.create({
    data: {
      telephone: data.telephone,
      nom: data.nom,
      prenom: data.prenom || 'Gérant',
      email_perso: data.email,
      role: 'COMMERCANT',
      statut: 'INACTIF',
      kyc_niveau: 'KYB',
    },
  });

  const commercant = await prisma.commercant.create({
    data: {
      user_id: user.id,
      nom: data.nom,
      type: data.type,
      ifu: data.ifu || null,
      niveau: data.ifu ? 'VERIFIE' : 'SIMPLIFIE',
      mobile_money_numero: data.mobile_money_numero,
      mobile_money_operateur: data.mobile_money_operateur,
      adresse: data.adresse,
      ville: data.ville || 'Cotonou',
      statut: 'SOUMIS',
    },
  });

  // Créer le wallet commerçant
  await prisma.wallet.create({
    data: { user_id: user.id, type: 'COMMERCANT', currency: 'XOF' },
  });

  return commercant;
}

async function getById(id) {
  return prisma.commercant.findUniqueOrThrow({
    where: { id },
    include: {
      user: { select: { id: true, telephone: true, nom: true, statut: true, wallet: true } },
    },
  });
}

// Champs qu'un commerçant peut modifier lui-même — statut, commission, plafond,
// niveau, ifu restent réservés à l'admin (validation/activation/anti-fraude).
const CHAMPS_AUTO_MODIFIABLES = [
  'nom', 'type', 'mobile_money_numero', 'mobile_money_operateur',
  'adresse', 'ville', 'horaires', 'photo_url', 'latitude', 'longitude',
];

async function modifier(id, data, role) {
  const payload = role === 'COMMERCANT'
    ? Object.fromEntries(Object.entries(data).filter(([k]) => CHAMPS_AUTO_MODIFIABLES.includes(k)))
    : data;
  return prisma.commercant.update({ where: { id }, data: payload });
}

async function valider(id, adminId) {
  const commercant = await prisma.commercant.update({
    where: { id },
    data: { statut: 'VALIDE' },
  });

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'COMMERCANT_VALIDE', entite: 'Commercant', entite_id: id },
  });

  return commercant;
}

async function activer(id, adminId) {
  const commercant = await prisma.commercant.findUniqueOrThrow({ where: { id } });

  const qrResult = await genererQRCodeCommercant(id, commercant.nom);

  const updated = await prisma.commercant.update({
    where: { id },
    data: { statut: 'ACTIF', qr_code_url: qrResult.url },
  });

  await prisma.user.update({
    where: { id: commercant.user_id },
    data: { statut: 'ACTIF' },
  });

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'COMMERCANT_ACTIVE', entite: 'Commercant', entite_id: id },
  });

  return updated;
}

async function suspendre(id, adminId) {
  const commercant = await prisma.commercant.update({
    where: { id },
    data: { statut: 'SUSPENDU' },
  });

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'COMMERCANT_SUSPENDU', entite: 'Commercant', entite_id: id },
  });

  return commercant;
}

/**
 * Recherche les commerçants actifs dans un rayon (Haversine), triés par distance ASC.
 * Remplace l'ancienne parProximite (calcul cartésien approximatif).
 */
async function rechercherCommercantsProches({ lat, lng, rayon, categorie, ouvert }) {
  const rayonMetres = parseInt(rayon) || 2000;

  const where = {
    statut: 'ACTIF',
    latitude: { not: null },
    longitude: { not: null },
  };
  if (categorie) where.type = categorie;

  const commercants = await prisma.commercant.findMany({
    where,
    select: {
      id: true, nom: true, type: true, niveau: true, adresse: true,
      ville: true, latitude: true, longitude: true, horaires: true,
      note_moyenne: true, photo_url: true, qr_code_url: true, taux_commission: true,
    },
  });

  let avecDistance = commercants
    .map((c) => {
      const distanceM = calculerDistance(lat, lng, parseFloat(c.latitude), parseFloat(c.longitude));
      const est_ouvert = estOuvertMaintenant(c.horaires, TIMEZONE_BENIN);
      return {
        ...c,
        latitude: parseFloat(c.latitude),
        longitude: parseFloat(c.longitude),
        note_moyenne: parseFloat(c.note_moyenne),
        taux_commission: parseFloat(c.taux_commission),
        distance_metres: Math.round(distanceM),
        distance_label: formaterDistance(distanceM),
        duree_a_pied: estimerDureeAPied(distanceM),
        est_ouvert,
      };
    })
    .filter((c) => c.distance_metres <= rayonMetres);

  if (ouvert === true || ouvert === 'true') {
    avecDistance = avecDistance.filter((c) => c.est_ouvert);
  }

  avecDistance.sort((a, b) => a.distance_metres - b.distance_metres);

  return {
    data: avecDistance.slice(0, MAX_RESULTATS_NEARBY),
    meta: { total: avecDistance.length, rayon_metres: rayonMetres, position: { lat, lng } },
  };
}

async function getFicheCommercant(commercantId, { lat, lng } = {}) {
  const commercant = await prisma.commercant.findUnique({
    where: { id: commercantId },
    include: { user: { select: { telephone: true, statut: true } } },
  });

  if (!commercant) return null;

  const result = {
    ...commercant,
    latitude: commercant.latitude ? parseFloat(commercant.latitude) : null,
    longitude: commercant.longitude ? parseFloat(commercant.longitude) : null,
    note_moyenne: parseFloat(commercant.note_moyenne),
    taux_commission: parseFloat(commercant.taux_commission),
    est_ouvert: estOuvertMaintenant(commercant.horaires, TIMEZONE_BENIN),
  };

  if (lat && lng && commercant.latitude && commercant.longitude) {
    const distanceM = calculerDistance(lat, lng, parseFloat(commercant.latitude), parseFloat(commercant.longitude));
    result.distance_metres = Math.round(distanceM);
    result.distance_label = formaterDistance(distanceM);
    result.duree_a_pied = estimerDureeAPied(distanceM);
  }

  return result;

}

// Conservé pour rétrocompatibilité interne
async function parProximite({ latitude, longitude, rayonKm = 5 }) {
  return rechercherCommercantsProches({
    lat: parseFloat(latitude),
    lng: parseFloat(longitude),
    rayon: rayonKm * 1000,
  }).then((r) => r.data);
}

async function regenererQRCode(id) {
  const commercant = await prisma.commercant.findUniqueOrThrow({ where: { id } });
  const qrResult = await genererQRCodeCommercant(id, commercant.nom);

  return prisma.commercant.update({
    where: { id },
    data: { qr_code_url: qrResult.url },
  });
}

// ── KYC commerçant — volontairement léger, jamais bloquant ────────────────
// (cf. commentaire schema.prisma sur CommercantDocument)
const TYPES_DOCUMENT_COMMERCANT = ['PIECE_IDENTITE_GERANT', 'JUSTIFICATIF_IFU'];

async function ajouterDocument(commercantId, type, fichier) {
  if (!TYPES_DOCUMENT_COMMERCANT.includes(type)) {
    const err = new Error('Type de document invalide'); err.statusCode = 400; throw err;
  }
  return prisma.commercantDocument.create({
    data: {
      commercant_id: commercantId,
      type,
      fichier_url: fichier.url,
      fichier_nom: fichier.originalname,
      fichier_taille: fichier.size,
    },
  });
}

async function getDocuments(commercantId) {
  return prisma.commercantDocument.findMany({
    where: { commercant_id: commercantId },
    orderBy: { createdAt: 'desc' },
  });
}

async function validerDocument(adminId, docId) {
  const doc = await prisma.commercantDocument.update({
    where: { id: docId },
    data: { statut: 'VALIDE', valide_par: adminId, valide_at: new Date() },
  });
  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'COMMERCANT_DOCUMENT_VALIDE', entite: 'CommercantDocument', entite_id: docId },
  });
  return doc;
}

async function rejeterDocument(adminId, docId, motif) {
  if (!motif || motif.trim().length < 10) {
    const err = new Error('Le motif de rejet doit contenir au moins 10 caractères');
    err.statusCode = 400; err.code = 'MOTIF_TROP_COURT';
    throw err;
  }
  const doc = await prisma.commercantDocument.update({
    where: { id: docId },
    data: { statut: 'REJETE', motif_rejet: motif.trim(), rejete_par: adminId, rejete_at: new Date() },
  });
  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'COMMERCANT_DOCUMENT_REJETE', entite: 'CommercantDocument', entite_id: docId },
  });
  return doc;
}

// ── Historiques (admin + auto-consultation commerçant) ─────────────────────
async function getTransactions(commercantId, { page = 1, limit = 20 } = {}) {
  const p = parseInt(page, 10) || 1;
  const l = parseInt(limit, 10) || 20;
  const where = { commercant_id: commercantId };

  const [total, items] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: { beneficiaire: { select: { nom: true, prenom: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * l,
      take: l,
    }),
  ]);

  return { items, total, page: p, totalPages: Math.ceil(total / l) };
}

async function getPayouts(commercantId) {
  return prisma.fedapayOperation.findMany({
    where: { commercant_id: commercantId, type: 'PAYOUT' },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
}

async function getByUserId(userId) {
  const result = await prisma.commercant.findUnique({
    where: { user_id: userId },
    include: {
      user: {
        select: { wallet: { select: { id: true, solde: true, currency: true, statut: true } } },
      },
    },
  });
  if (!result) return null;
  const { user, ...rest } = result;
  return { ...rest, wallet: user?.wallet ?? null };
}

module.exports = {
  lister, creer, getById, getByUserId, modifier, valider, activer, suspendre,
  rechercherCommercantsProches, getFicheCommercant, parProximite,
  regenererQRCode, ajouterDocument, getDocuments, validerDocument, rejeterDocument,
  getTransactions, getPayouts,
};
