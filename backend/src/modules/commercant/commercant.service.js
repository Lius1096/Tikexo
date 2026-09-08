// Service commerçant TIKEXO
const prisma = require('../../config/database');
// Même variable d'environnement que fedapay.service.js#declencherPayout —
// exposée ici pour que le client affiche le montant net AVANT confirmation
// d'un reversement manuel (transparence sur les frais avant l'action, pas
// juste après).
const TAUX_FRAIS_PAYOUT_MANUEL = parseFloat(process.env.TIKEXO_PAYOUT_FRAIS_MANUEL_TAUX || '1.5');
const { genererQRCodeCommercant } = require('../../utils/qrcode');
const { envoyerEmailAsync } = require('../../utils/email');
const { logger } = require('../../middlewares/errorHandler');
const {
  commercantActive,
  commercantDocumentValide,
  commercantDocumentRejete,
  ticketRetraitTraite,
  ticketRetraitRejete,
} = require('../../utils/emailTemplates');

const { getPlatformConfig } = require('../../utils/platformConfig');

const ROLES_ADMIN_COMMERCANT = ['SUPER_ADMIN', 'ADMIN_OPS'];
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

  // Taux de commission par défaut, réglable depuis /admin/configuration
  // (n'affecte que les nouvelles créations, jamais les comptes existants).
  const { taux_frais_commercant_defaut } = await getPlatformConfig();

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
        taux_commission: taux_frais_commercant_defaut,
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

/**
 * Fiche publique — accessible sans authentification (QR vitrine affiché en
 * rue/vitrine). Ne renvoie QUE des champs non sensibles : jamais le numéro
 * Mobile Money, l'IFU, le téléphone, le taux de commission ou les volumes.
 */
async function getFichePublique(commercantId) {
  const commercant = await prisma.commercant.findUnique({
    where: { id: commercantId },
    select: {
      id: true, nom: true, type: true, ville: true, adresse: true,
      horaires: true, photo_url: true, note_moyenne: true, statut: true,
    },
  });

  if (!commercant || commercant.statut !== 'ACTIF') return null;

  return {
    id: commercant.id,
    nom: commercant.nom,
    type: commercant.type,
    ville: commercant.ville,
    adresse: commercant.adresse,
    photo_url: commercant.photo_url,
    note_moyenne: parseFloat(commercant.note_moyenne),
    est_ouvert: estOuvertMaintenant(commercant.horaires, TIMEZONE_BENIN),
  };
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

// Même principe que kyb.service.js#getDocumentAutorise — le bucket S3/MinIO
// reste privé. On vérifie l'accès puis le contrôleur relaie le fichier en
// flux (envoyerFichier) — jamais d'URL présignée distribuée.
async function getDocumentAutorise(docId, requester) {
  const doc = await prisma.commercantDocument.findUniqueOrThrow({
    where: { id: docId },
    include: { commercant: { select: { user_id: true } } },
  });

  const estAdmin = ROLES_ADMIN_COMMERCANT.includes(requester.role);
  const estProprietaire = requester.id === doc.commercant.user_id;
  if (!estAdmin && !estProprietaire) {
    const err = new Error('Accès refusé à ce document'); err.statusCode = 403; throw err;
  }

  return doc;
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

  require('../notification/notification.service').creerEtNotifier(avant.commercant.user_id, {
    titre: 'Document validé',
    corps: `Votre document "${LABEL_TYPE_DOCUMENT[avant.type] || avant.type}" a été validé`,
    type: 'KYC',
  }).catch(() => {});

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

  require('../notification/notification.service').creerEtNotifier(avant.commercant.user_id, {
    titre: 'Document à renvoyer',
    corps: `Votre document "${LABEL_TYPE_DOCUMENT[avant.type] || avant.type}" a été rejeté : ${motif.trim()}`,
    type: 'KYC',
  }).catch(() => {});

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
        select: { wallet: { select: { id: true, solde: true, solde_reserve: true, currency: true, statut: true } } },
      },
    },
  });
  if (!result) return null;
  const { user, ...rest } = result;
  const { seuil_ticket_retrait } = await getPlatformConfig();
  return {
    ...rest,
    wallet: user?.wallet ?? null,
    frais_payout_manuel_taux: TAUX_FRAIS_PAYOUT_MANUEL,
    seuil_ticket_retrait,
  };
}

// ── Tickets de retrait manuel ────────────────────────────────────────────
// En attendant l'intégration FedaPay "checkout envoi multiple" (voir
// NOTES-FEDAPAY.md), tout retrait commerçant passe par un ticket traité
// manuellement par un admin TIKEXO avec preuve de virement Mobile Money à
// l'appui — remplace le déclenchement direct d'un payout FedaPay par le
// commerçant (fedapay.service.js#declencherPayout, conservé mais plus
// appelé depuis ce flux ; jobBatchingPayouts n'est plus planifié non plus,
// voir queues/startWorkers.js).
async function creerTicketRetrait(commercantId) {
  const { verrouillerWallet } = require('../../utils/ledger');
  const { seuil_ticket_retrait: seuilTicketRetrait } = await getPlatformConfig();

  const { ticket, userId } = await prisma.$transaction(async (tx) => {
    const commercant = await tx.commercant.findUniqueOrThrow({
      where: { id: commercantId },
      include: { user: { select: { wallet: true } } },
    });

    if (commercant.statut !== 'ACTIF') {
      const err = new Error('Compte marchand suspendu — retrait indisponible');
      err.statusCode = 422; err.code = 'COMMERCANT_NON_ACTIF'; throw err;
    }

    const wallet = commercant.user.wallet;
    if (!wallet) {
      const err = new Error('Wallet introuvable'); err.statusCode = 404; throw err;
    }

    const ticketEnAttente = await tx.ticketRetrait.findFirst({
      where: { commercant_id: commercantId, statut: 'EN_ATTENTE' },
    });
    if (ticketEnAttente) {
      const err = new Error('Une demande de retrait est déjà en cours de traitement — contactez le support si besoin de la modifier');
      err.statusCode = 409; err.code = 'TICKET_DEJA_EN_COURS'; throw err;
    }

    // Verrou pessimiste — empêche un double-clic (ou deux appels concurrents)
    // de réserver deux fois le même solde disponible.
    const walletVerrouille = await verrouillerWallet(tx, wallet.id);
    const soldeDisponible = Math.floor(
      parseFloat(walletVerrouille.solde.toString()) - parseFloat(walletVerrouille.solde_reserve.toString())
    );

    if (soldeDisponible < seuilTicketRetrait) {
      const err = new Error(
        `Solde disponible insuffisant pour un retrait. Minimum requis : ${seuilTicketRetrait.toLocaleString('fr-FR')} XOF, disponible : ${Math.max(soldeDisponible, 0).toLocaleString('fr-FR')} XOF.`
      );
      err.statusCode = 422; err.code = 'SOLDE_INSUFFISANT_TICKET'; throw err;
    }

    const nouveauTicket = await tx.ticketRetrait.create({
      data: { commercant_id: commercantId, montant: soldeDisponible },
    });

    await tx.$executeRaw`
      UPDATE "Wallet" SET solde_reserve = solde_reserve + ${soldeDisponible}::numeric, "updatedAt" = NOW()
      WHERE id = ${wallet.id}
    `;

    return { ticket: nouveauTicket, userId: commercant.user_id };
  });

  await prisma.auditLog.create({
    data: { user_id: userId, action: 'TICKET_RETRAIT_CREE', entite: 'TicketRetrait', entite_id: ticket.id, apres: { montant: parseFloat(ticket.montant.toString()), commercantId } },
  });

  return ticket;
}

async function listerMesTicketsRetrait(commercantId) {
  return prisma.ticketRetrait.findMany({
    where: { commercant_id: commercantId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
}

async function listerTicketsRetrait(filtres = {}) {
  const where = filtres.statut ? { statut: filtres.statut } : {};
  return prisma.ticketRetrait.findMany({
    where,
    include: { commercant: { select: { id: true, nom: true, mobile_money_numero: true, mobile_money_operateur: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

async function getTicketRetraitAvecContact(ticketId) {
  return prisma.ticketRetrait.findUniqueOrThrow({
    where: { id: ticketId },
    include: {
      commercant: {
        include: { user: { select: { id: true, email_perso: true, nom: true, prenom: true, wallet: true } } },
      },
    },
  });
}

async function getTicketRetraitAutorise(ticketId, requester) {
  const ticket = await prisma.ticketRetrait.findUniqueOrThrow({
    where: { id: ticketId },
    include: { commercant: { select: { user_id: true } } },
  });
  const estAdmin = ROLES_ADMIN_COMMERCANT.includes(requester.role);
  const estProprietaire = requester.id === ticket.commercant.user_id;
  if (!estAdmin && !estProprietaire) {
    const err = new Error('Accès refusé à ce ticket'); err.statusCode = 403; throw err;
  }
  if (!ticket.preuve_url) {
    const err = new Error('Aucune preuve disponible pour ce ticket'); err.statusCode = 404; throw err;
  }
  return ticket;
}

async function validerTicketRetrait(adminId, ticketId, preuveUrl) {
  if (!preuveUrl) {
    const err = new Error('La preuve de virement est obligatoire pour valider un retrait');
    err.statusCode = 400; err.code = 'PREUVE_REQUISE'; throw err;
  }

  const avant = await getTicketRetraitAvecContact(ticketId);
  if (avant.statut !== 'EN_ATTENTE') {
    const err = new Error('Ce ticket a déjà été traité'); err.statusCode = 409; throw err;
  }

  const walletId = avant.commercant.user.wallet.id;
  const montant = parseFloat(avant.montant.toString());

  const { debiterWallet } = require('../../utils/ledger');
  await debiterWallet(prisma, walletId, montant, 'PAYOUT', { ticket_retrait_id: ticketId, manuel: true });

  // La réservation faite à la création du ticket n'a plus lieu d'être : le
  // montant vient d'être réellement débité du solde.
  await prisma.$executeRaw`
    UPDATE "Wallet" SET solde_reserve = GREATEST(0, solde_reserve - ${montant}::numeric), "updatedAt" = NOW()
    WHERE id = ${walletId}
  `;

  const ticket = await prisma.ticketRetrait.update({
    where: { id: ticketId },
    data: { statut: 'TRAITE', preuve_url: preuveUrl, traite_par: adminId, traite_at: new Date() },
  });

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'TICKET_RETRAIT_TRAITE', entite: 'TicketRetrait', entite_id: ticketId, apres: { montant } },
  });

  const contact = avant.commercant.user;
  if (contact.email_perso) {
    const nomContact = `${contact.prenom || ''} ${contact.nom || ''}`.trim() || avant.commercant.nom;
    const { html, text } = ticketRetraitTraite(nomContact, montant);
    envoyerEmailAsync({ to: contact.email_perso, subject: 'TIKEXO — Retrait effectué', html, text })
      .catch((e) => logger.warn('TIKEXO — Email ticket retrait traité échoué', { err: e.message, ticketId }));
  }

  require('../notification/notification.service').creerEtNotifier(contact.id, {
    titre: 'Retrait effectué',
    corps: `Votre retrait de ${Math.floor(montant).toLocaleString('fr-FR')} XOF a été effectué`,
    type: 'REVERSEMENT',
  }).catch(() => {});

  return ticket;
}

async function rejeterTicketRetrait(adminId, ticketId, motif) {
  if (!motif || motif.trim().length < 10) {
    const err = new Error('Le motif de rejet doit contenir au moins 10 caractères');
    err.statusCode = 400; err.code = 'MOTIF_TROP_COURT'; throw err;
  }

  const avant = await getTicketRetraitAvecContact(ticketId);
  if (avant.statut !== 'EN_ATTENTE') {
    const err = new Error('Ce ticket a déjà été traité'); err.statusCode = 409; throw err;
  }

  const walletId = avant.commercant.user.wallet.id;
  const montant = parseFloat(avant.montant.toString());

  // Libère la réservation — le montant redevient disponible dans le wallet.
  await prisma.$executeRaw`
    UPDATE "Wallet" SET solde_reserve = GREATEST(0, solde_reserve - ${montant}::numeric), "updatedAt" = NOW()
    WHERE id = ${walletId}
  `;

  const ticket = await prisma.ticketRetrait.update({
    where: { id: ticketId },
    data: { statut: 'REJETE', motif_rejet: motif.trim(), traite_par: adminId, traite_at: new Date() },
  });

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'TICKET_RETRAIT_REJETE', entite: 'TicketRetrait', entite_id: ticketId, apres: { motif: motif.trim() } },
  });

  const contact = avant.commercant.user;
  if (contact.email_perso) {
    const nomContact = `${contact.prenom || ''} ${contact.nom || ''}`.trim() || avant.commercant.nom;
    const { html, text } = ticketRetraitRejete(nomContact, montant, motif.trim());
    envoyerEmailAsync({ to: contact.email_perso, subject: 'TIKEXO — Demande de retrait rejetée', html, text })
      .catch((e) => logger.warn('TIKEXO — Email ticket retrait rejeté échoué', { err: e.message, ticketId }));
  }

  require('../notification/notification.service').creerEtNotifier(contact.id, {
    titre: 'Demande de retrait rejetée',
    corps: motif.trim(),
    type: 'REVERSEMENT',
  }).catch(() => {});

  return ticket;
}

module.exports = {
  lister, creer, getById, getByUserId, getStats, modifier, valider, activer, suspendre, archiver,
  rechercherCommercantsProches, getFicheCommercant, getFichePublique, parProximite,
  regenererQRCode, ajouterDocument, getDocuments, validerDocument, rejeterDocument,
  getTransactions, getPayouts, getDocumentAutorise,
  creerTicketRetrait, listerMesTicketsRetrait, listerTicketsRetrait,
  getTicketRetraitAutorise, validerTicketRetrait, rejeterTicketRetrait,
};
