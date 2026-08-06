// Service commerçant TIKEXO
const prisma = require('../../config/database');
const { genererQRCodeCommercant } = require('../../utils/qrcode');
const { envoyerEmailAsync } = require('../../utils/email');
const { logger } = require('../../middlewares/errorHandler');
const {
  commercantActive,
  commercantDocumentValide,
  commercantDocumentRejete,
} = require('../../utils/emailTemplates');
const {
  calculerDistance,
  formaterDistance,
  estimerDureeAPied,
  estOuvertMaintenant,
  TIMEZONE_BENIN,
} = require('../../utils/geo');

/**
 * Vérifie qu'une transition d'état part bien d'un des statuts autorisés —
 * sans ça, activer()/valider()/suspendre() pourraient être appelées dans
 * n'importe quel ordre (ex: activer directement un SOUMIS en sautant la
 * validation du dossier).
 */
function assertTransition(statutActuel, statutsAutorises, action) {
  if (!statutsAutorises.includes(statutActuel)) {
    const err = new Error(
      `Impossible de ${action} un commerçant au statut ${statutActuel} — statuts autorisés : ${statutsAutorises.join(', ')}`
    );
    err.statusCode = 409;
    err.code = 'TRANSITION_INVALIDE';
    throw err;
  }
}

const MAX_RESULTATS_NEARBY = 20;
const TYPES_COMMERCANT_VALIDES = ['RESTAURANT', 'BOULANGERIE', 'EPICERIE', 'TRAITEUR', 'CAFETERIA', 'LIVRAISON', 'SUPERMARCHE'];

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
  if (!TYPES_COMMERCANT_VALIDES.includes(data.type)) {
    const err = new Error("Type d'établissement invalide");
    err.statusCode = 400;
    throw err;
  }

  // Transaction : user + commercant + wallet — évite un compte orphelin si
  // une des créations échoue après que les précédentes ont réussi (même
  // pattern que inscrireCommercant côté self-service).
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
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

    const commercant = await tx.commercant.create({
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

    await tx.wallet.create({
      data: { user_id: user.id, type: 'COMMERCANT', currency: 'XOF' },
    });

    return commercant;
  });
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
  const existant = await prisma.commercant.findUniqueOrThrow({ where: { id } });
  assertTransition(existant.statut, ['SOUMIS'], 'valider');

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
  const commercant = await prisma.commercant.findUniqueOrThrow({
    where: { id },
    include: { user: { select: { email_perso: true, nom: true, prenom: true } } },
  });
  assertTransition(commercant.statut, ['VALIDE', 'SUSPENDU'], 'activer');

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

  if (commercant.user.email_perso) {
    const nomContact = `${commercant.user.prenom || ''} ${commercant.user.nom || ''}`.trim() || commercant.nom;
    const { html, text } = commercantActive(commercant.nom, nomContact);
    envoyerEmailAsync({ to: commercant.user.email_perso, subject: 'TIKEXO — Votre compte commerçant est actif', html, text })
      .catch((e) => logger.warn('TIKEXO — Email activation commerçant échoué', { err: e.message, id }));
  }

  return updated;
}

async function suspendre(id, adminId) {
  const existant = await prisma.commercant.findUniqueOrThrow({ where: { id } });
  assertTransition(existant.statut, ['ACTIF'], 'suspendre');

  const commercant = await prisma.commercant.update({
    where: { id },
    data: { statut: 'SUSPENDU' },
  });

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'COMMERCANT_SUSPENDU', entite: 'Commercant', entite_id: id },
  });

  return commercant;
}

async function archiver(id, adminId) {
  const existant = await prisma.commercant.findUniqueOrThrow({ where: { id } });
  assertTransition(existant.statut, ['ACTIF', 'SUSPENDU'], 'archiver');

  const commercant = await prisma.commercant.update({
    where: { id },
    data: { statut: 'ARCHIVE' },
  });

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'COMMERCANT_ARCHIVE', entite: 'Commercant', entite_id: id },
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
const LABEL_TYPE_DOCUMENT = {
  PIECE_IDENTITE_GERANT: "Pièce d'identité du gérant",
  JUSTIFICATIF_IFU: 'Justificatif IFU',
};

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
  const documents = await prisma.commercantDocument.findMany({
    where: { commercant_id: commercantId },
    orderBy: { createdAt: 'desc' },
  });
  // Un même type peut avoir plusieurs soumissions (re-upload après rejet) —
  // seul le plus récent par type est "courant", les autres sont un historique.
  const typesVus = new Set();
  return documents.map((doc) => {
    const estCourant = !typesVus.has(doc.type);
    typesVus.add(doc.type);
    return { ...doc, estCourant };
  });
}

async function getDocumentAvecContact(docId) {
  return prisma.commercantDocument.findUniqueOrThrow({
    where: { id: docId },
    include: { commercant: { include: { user: { select: { email_perso: true, nom: true, prenom: true } } } } },
  });
}

async function validerDocument(adminId, docId) {
  const avant = await getDocumentAvecContact(docId);

  const doc = await prisma.commercantDocument.update({
    where: { id: docId },
    data: { statut: 'VALIDE', valide_par: adminId, valide_at: new Date() },
  });
  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'COMMERCANT_DOCUMENT_VALIDE', entite: 'CommercantDocument', entite_id: docId },
  });

  const contact = avant.commercant.user;
  if (contact.email_perso) {
    const nomContact = `${contact.prenom || ''} ${contact.nom || ''}`.trim() || avant.commercant.nom;
    const { html, text } = commercantDocumentValide(nomContact, LABEL_TYPE_DOCUMENT[avant.type] || avant.type);
    envoyerEmailAsync({ to: contact.email_perso, subject: 'TIKEXO — Document validé', html, text })
      .catch((e) => logger.warn('TIKEXO — Email validation document commerçant échoué', { err: e.message, docId }));
  }

  return doc;
}

async function rejeterDocument(adminId, docId, motif) {
  if (!motif || motif.trim().length < 10) {
    const err = new Error('Le motif de rejet doit contenir au moins 10 caractères');
    err.statusCode = 400; err.code = 'MOTIF_TROP_COURT';
    throw err;
  }

  const avant = await getDocumentAvecContact(docId);

  const doc = await prisma.commercantDocument.update({
    where: { id: docId },
    data: { statut: 'REJETE', motif_rejet: motif.trim(), rejete_par: adminId, rejete_at: new Date() },
  });
  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'COMMERCANT_DOCUMENT_REJETE', entite: 'CommercantDocument', entite_id: docId },
  });

  const contact = avant.commercant.user;
  if (contact.email_perso) {
    const nomContact = `${contact.prenom || ''} ${contact.nom || ''}`.trim() || avant.commercant.nom;
    const { html, text } = commercantDocumentRejete(nomContact, LABEL_TYPE_DOCUMENT[avant.type] || avant.type, motif.trim());
    envoyerEmailAsync({ to: contact.email_perso, subject: 'TIKEXO — Document à renvoyer', html, text })
      .catch((e) => logger.warn('TIKEXO — Email rejet document commerçant échoué', { err: e.message, docId }));
  }

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

async function getStats(commercantId) {
  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);
  const finJour = new Date();
  finJour.setHours(23, 59, 59, 999);

  const [agregJour, agregTotal] = await Promise.all([
    prisma.transaction.aggregate({
      where: { commercant_id: commercantId, statut: 'VALIDEE', createdAt: { gte: debutJour, lte: finJour } },
      _sum: { montant_total: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { commercant_id: commercantId, statut: 'VALIDEE' },
      _sum: { montant_total: true },
      _count: true,
    }),
  ]);

  return {
    volume_jour: parseFloat(agregJour._sum.montant_total || 0),
    transactions_jour: agregJour._count,
    volume_total: parseFloat(agregTotal._sum.montant_total || 0),
    transactions_total: agregTotal._count,
  };
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
  lister, creer, getById, getByUserId, getStats, modifier, valider, activer, suspendre, archiver,
  rechercherCommercantsProches, getFicheCommercant, parProximite,
  regenererQRCode, ajouterDocument, getDocuments, validerDocument, rejeterDocument,
  getTransactions, getPayouts,
};
