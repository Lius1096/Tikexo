// Service cartes TIKEXO — virtuelle + physique + QR + NFC
const prisma = require('../../config/database');
const carteUtils = require('../../utils/carte');
const { envoyerEmail } = require('../../utils/email');
const templates = require('../../utils/emailTemplates');

// ─── Bénéficiaire : créer sa carte virtuelle ──────────────────────────────────

async function creerVirtuelle(userId) {
  const existing = await prisma.carteDigi.findFirst({
    where: { user_id: userId, statut: 'ACTIVE' },
  });
  if (existing) {
    const err = new Error('Une carte active existe déjà pour ce compte');
    err.statusCode = 409;
    throw err;
  }

  const { hash, suffixe, numeroMasque } = await carteUtils.genererNumeroCarte(prisma);

  const carte = await prisma.carteDigi.create({
    data: {
      user_id        : userId,
      type           : 'VIRTUELLE',
      numero_hash    : hash,
      numero_masque  : numeroMasque,
      prefixe        : process.env.CARTE_PREFIXE || '4782',
      suffixe,
      date_expiration: carteUtils.genererDateExpiration(),
      statut         : 'ACTIVE',
    },
  });

  await prisma.auditLog.create({
    data: { user_id: userId, action: 'CARTE_VIRTUELLE_CREEE', entite: 'CarteDigi', entite_id: carte.id },
  });

  return _formatCarte(carte);
}

// ─── Bénéficiaire : consulter sa carte ───────────────────────────────────────

async function getMaCarte(userId) {
  const carte = await prisma.carteDigi.findFirst({
    where    : { user_id: userId },
    orderBy  : { createdAt: 'desc' },
    include  : { user: { select: { nom: true, prenom: true, liensBeneficiaire: {
      where  : { statut: 'ACTIF' },
      select : { entreprise: { select: { nom: true } } },
      take   : 1,
    }}}}
  });
  if (!carte) return null;
  return _formatCarte(carte);
}

// ─── CVV dynamique ────────────────────────────────────────────────────────────

async function getCVV(userId, carteId) {
  const carte = await _verifierPropriete(userId, carteId);
  _verifierActive(carte);

  const cvv = carteUtils.genererCVV(carte.id, carteUtils.moisCourant());

  await prisma.auditLog.create({
    data: { user_id: userId, action: 'CARTE_CVV_CONSULTE', entite: 'CarteDigi', entite_id: carteId },
  });

  return { cvv, expire_dans_secondes: 30 };
}

// ─── QR Code dynamique ───────────────────────────────────────────────────────

async function getQRCode(userId, carteId) {
  const carte = await _verifierPropriete(userId, carteId);
  _verifierActive(carte);

  const wallet = await prisma.wallet.findFirst({
    where: { user_id: userId, type: 'BENEFICIAIRE' },
  });
  if (!wallet) {
    const err = new Error('Wallet introuvable'); err.statusCode = 404; throw err;
  }

  const maintenant = new Date();
  if (carte.qr_expires_at && new Date(carte.qr_expires_at) > maintenant && carte.qr_code_url) {
    const secondesRestantes = Math.floor((new Date(carte.qr_expires_at) - maintenant) / 1000);
    return { qr_url: carte.qr_code_url, expires_at: carte.qr_expires_at, secondes_restantes: secondesRestantes };
  }

  const { payloadStr, signature } = carteUtils.genererQRCodePayload(wallet.id);
  const expiresAt = new Date(Date.now() + 60_000);

  // Stocker le nonce en base pour anti-replay
  const payload = JSON.parse(payloadStr);
  await prisma.qRCodeTransaction.create({
    data: {
      wallet_id : wallet.id,
      nonce     : payload.nonce,
      expires_at: expiresAt,
    },
  });

  // En production : uploader sur Cloudinary, retourner l'URL
  // En dev : retourner un data-URL ou placeholder
  const qrData = `tikexo:${payloadStr}::${signature}`;

  await prisma.carteDigi.update({
    where: { id: carteId },
    data : { qr_code_url: qrData, qr_expires_at: expiresAt, qr_refresh_count: { increment: 1 } },
  });

  return { qr_url: qrData, expires_at: expiresAt, secondes_restantes: 60 };
}

// ─── Valider QR (côté commerçant) ────────────────────────────────────────────

async function validerQR(payloadStr, signature) {
  const resultat = carteUtils.validerQRCodeSignature(payloadStr, signature);
  if (!resultat.valide) {
    const err = new Error(resultat.motif); err.statusCode = 400; throw err;
  }

  const { nonce, wallet_id } = resultat.payload;

  const qrRecord = await prisma.qRCodeTransaction.findUnique({ where: { nonce } });
  if (!qrRecord || qrRecord.utilise) {
    const err = new Error('QR code déjà utilisé ou invalide'); err.statusCode = 409; throw err;
  }

  await prisma.qRCodeTransaction.update({
    where: { nonce },
    data : { utilise: true, utilise_at: new Date() },
  });

  const wallet = await prisma.wallet.findUnique({
    where: { id: wallet_id },
    select: { id: true, solde: true, statut: true },
  });

  if (!wallet || wallet.statut !== 'ACTIF') {
    const err = new Error('Wallet non disponible'); err.statusCode = 403; throw err;
  }

  return { autorise: true, wallet_id, montant_max_disponible: Number(wallet.solde) };
}

// ─── NFC Token (côté terminal) ───────────────────────────────────────────────

async function validerNFC(tokenStr, signature) {
  const resultat = carteUtils.validerNFCToken(tokenStr, signature);
  if (!resultat.valide) {
    const err = new Error(resultat.motif); err.statusCode = 400; throw err;
  }

  const { token_unique, wallet_id } = resultat.token;
  const montantMax = parseInt(process.env.CARTE_NFC_MONTANT_MAX || '5000', 10);

  const nfcRecord = await prisma.nFCToken.findUnique({ where: { token_unique } });
  if (!nfcRecord || nfcRecord.utilise) {
    const err = new Error('Token NFC déjà utilisé ou invalide'); err.statusCode = 409; throw err;
  }

  await prisma.nFCToken.update({
    where: { token_unique },
    data : { utilise: true },
  });

  return { autorise: true, wallet_id, montant_max_sans_pin: montantMax };
}

// ─── Blocage / déblocage ─────────────────────────────────────────────────────

async function bloquer(carteId, acteurId) {
  const carte = await prisma.carteDigi.findUniqueOrThrow({ where: { id: carteId } });
  if (carte.statut === 'BLOQUEE') {
    const err = new Error('Carte déjà bloquée'); err.statusCode = 400; throw err;
  }

  // Invalider tous les QR actifs
  await prisma.qRCodeTransaction.updateMany({
    where: { wallet_id: { not: undefined }, utilise: false },
  });

  const updated = await prisma.carteDigi.update({
    where: { id: carteId },
    data : { statut: 'BLOQUEE', qr_code_url: null, qr_expires_at: null },
  });

  await prisma.auditLog.create({
    data: { user_id: acteurId, action: 'CARTE_BLOQUEE', entite: 'CarteDigi', entite_id: carteId },
  });

  return _formatCarte(updated);
}

async function debloquer(carteId, adminId) {
  const carte = await prisma.carteDigi.findUniqueOrThrow({ where: { id: carteId } });
  if (carte.statut !== 'BLOQUEE') {
    const err = new Error('Seule une carte bloquée peut être débloquée'); err.statusCode = 400; throw err;
  }

  const updated = await prisma.carteDigi.update({
    where: { id: carteId },
    data : { statut: 'ACTIVE' },
  });

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'CARTE_DEBLOQUEE', entite: 'CarteDigi', entite_id: carteId },
  });

  return _formatCarte(updated);
}

// ─── Demande carte physique ───────────────────────────────────────────────────

async function demanderPhysique(userId, adresseLivraison) {
  const user = await prisma.user.findUniqueOrThrow({
    where : { id: userId },
    select: { id: true, nom: true, prenom: true, kyc_niveau: true, kyc_via_entreprise: true },
  });

  if (!user.kyc_via_entreprise) {
    const err = new Error('KYB requis pour demander une carte physique'); err.statusCode = 403; throw err;
  }

  const virtuelle = await prisma.carteDigi.findFirst({
    where: { user_id: userId, type: 'VIRTUELLE', statut: 'ACTIVE' },
  });
  if (!virtuelle) {
    const err = new Error('Vous devez avoir une carte virtuelle active'); err.statusCode = 400; throw err;
  }

  const existante = await prisma.carteDigi.findFirst({
    where: { user_id: userId, type: 'PHYSIQUE', statut: { not: 'EXPIREE' } },
  });
  if (existante) {
    const err = new Error('Une demande de carte physique est déjà en cours'); err.statusCode = 409; throw err;
  }

  const { code, hash } = carteUtils.genererCodeActivation();
  const { hash: numHash, suffixe, numeroMasque } = await carteUtils.genererNumeroCarte(prisma);

  const carte = await prisma.carteDigi.create({
    data: {
      user_id              : userId,
      type                 : 'PHYSIQUE',
      numero_hash          : numHash,
      numero_masque        : numeroMasque,
      prefixe              : process.env.CARTE_PREFIXE || '4782',
      suffixe,
      date_expiration      : carteUtils.genererDateExpiration(),
      statut               : 'COMMANDE',
      adresse_livraison    : adresseLivraison,
      code_activation_hash : hash,
    },
  });

  await prisma.auditLog.create({
    data: { user_id: userId, action: 'CARTE_PHYSIQUE_DEMANDEE', entite: 'CarteDigi', entite_id: carte.id },
  });

  // En prod : notifier ops@tikexo.bj
  if (process.env.NODE_ENV === 'production') {
    const { html, text } = templates.alerteInterne('CARTE_PHYSIQUE_DEMANDEE', {
      user_id: userId, nom: `${user.prenom} ${user.nom}`, adresse: adresseLivraison, carte_id: carte.id,
    });
    await envoyerEmail({ to: 'ops@tikexo.bj', subject: '[TIKEXO] Nouvelle demande carte physique', html, text, expediteur: 'ops' });
  } else {
    console.log(`[CARTE PHYSIQUE] Code activation (DEV) : ${code} — userId: ${userId}`);
  }

  return { carte_id: carte.id, numero_masque: numeroMasque, code_activation: process.env.NODE_ENV !== 'production' ? code : undefined };
}

async function activerPhysique(userId, carteId, codeActivation) {
  const carte = await _verifierPropriete(userId, carteId);
  if (carte.type !== 'PHYSIQUE') {
    const err = new Error('Cette carte n\'est pas une carte physique'); err.statusCode = 400; throw err;
  }
  if (carte.activee_at) {
    const err = new Error('Carte déjà activée'); err.statusCode = 409; throw err;
  }
  if (!carte.code_activation_hash || !carteUtils.verifierCodeActivation(codeActivation, carte.code_activation_hash)) {
    const err = new Error('Code d\'activation invalide'); err.statusCode = 401; throw err;
  }

  const updated = await prisma.carteDigi.update({
    where: { id: carteId },
    data : { activee_at: new Date(), code_activation_hash: null },
  });

  await prisma.auditLog.create({
    data: { user_id: userId, action: 'CARTE_PHYSIQUE_ACTIVEE', entite: 'CarteDigi', entite_id: carteId },
  });

  return _formatCarte(updated);
}

// ─── Admin : créer carte pour un bénéficiaire ─────────────────────────────────

async function creer(userId, adminId) {
  const existing = await prisma.carteDigi.findFirst({
    where: { user_id: userId, statut: 'ACTIVE' },
  });
  if (existing) {
    const err = new Error('Ce bénéficiaire possède déjà une carte active'); err.statusCode = 409; throw err;
  }

  const { hash, suffixe, numeroMasque } = await carteUtils.genererNumeroCarte(prisma);

  const carte = await prisma.carteDigi.create({
    data: {
      user_id        : userId,
      type           : 'VIRTUELLE',
      numero_hash    : hash,
      numero_masque  : numeroMasque,
      prefixe        : process.env.CARTE_PREFIXE || '4782',
      suffixe,
      date_expiration: carteUtils.genererDateExpiration(),
      statut         : 'ACTIVE',
    },
  });

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'CARTE_CREEE', entite: 'CarteDigi', entite_id: carte.id },
  });

  return _formatCarte(carte);
}

// ─── Demande employeur (pour un bénéficiaire de son entreprise) ───────────────

async function demanderPhysiqueEmployeur(userId, adresseLivraison, employeurId) {
  // Vérifie que le bénéficiaire est bien dans l'entreprise de l'employeur
  const lien = await prisma.lienEntrepriseBeneficiaire.findFirst({
    where: {
      user_id       : userId,
      entreprise_id : (await prisma.entrepriseAdmin.findUnique({ where: { user_id: employeurId } }))?.entreprise_id,
      statut        : 'ACTIF',
    },
  });
  if (!lien) {
    const err = new Error('Ce bénéficiaire n\'appartient pas à votre entreprise'); err.statusCode = 403; throw err;
  }
  return demanderPhysique(userId, adresseLivraison);
}

// ─── Admin : valider une demande de carte physique ────────────────────────────

async function listerDemandes(filtres = {}) {
  const p = parseInt(filtres.page, 10) || 1;
  const l = parseInt(filtres.limit, 10) || 20;

  const [total, items] = await Promise.all([
    prisma.carteDigi.count({ where: { type: 'PHYSIQUE', statut: 'COMMANDE' } }),
    prisma.carteDigi.findMany({
      where  : { type: 'PHYSIQUE', statut: 'COMMANDE' },
      include: {
        user: {
          select: {
            id: true, nom: true, prenom: true, telephone: true,
            liensBeneficiaire: {
              where : { statut: 'ACTIF' },
              select: { entreprise: { select: { id: true, nom: true } } },
              take  : 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },  // FIFO
      skip   : (p - 1) * l,
      take   : l,
    }),
  ]);

  return { items: items.map(_formatCarte), total, page: p, totalPages: Math.ceil(total / l) };
}

async function validerDemande(carteId, adminId) {
  const carte = await prisma.carteDigi.findUnique({
    where  : { id: carteId },
    include: { user: { select: { id: true, nom: true, prenom: true, telephone: true, email_perso: true } } },
  });

  if (!carte || carte.type !== 'PHYSIQUE' || carte.statut !== 'COMMANDE') {
    const err = new Error('Demande introuvable ou déjà traitée'); err.statusCode = 400; throw err;
  }

  const updated = await prisma.carteDigi.update({
    where: { id: carteId },
    data : { statut: 'EXPEDIE', expedie_at: new Date() },
  });

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'CARTE_PHYSIQUE_EXPEDIEE', entite: 'CarteDigi', entite_id: carteId },
  });

  // Récupérer le code d'activation pour l'envoyer
  const { genererCodeActivation, verifierCodeActivation: _ } = carteUtils;
  // Note: le code est déjà dans code_activation_hash (hash SHA-256), on ne peut pas le recalculer
  // En prod: le code a été envoyé lors de la demande ou stocké en base autrement
  // En dev: on retourne un code de démo pour les tests
  const codeDevTest = process.env.NODE_ENV !== 'production' ? '123456' : undefined;

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[CARTE PHYSIQUE] Expédiée ${carteId} → ${carte.user.prenom} ${carte.user.nom} (code test: 123456)`);
  }

  return { ..._formatCarte(updated), user: carte.user, code_activation_dev: codeDevTest };
}

// ─── Listages ─────────────────────────────────────────────────────────────────

async function lister(entrepriseId) {
  const liens = await prisma.lienEntrepriseBeneficiaire.findMany({
    where  : { entreprise_id: entrepriseId, statut: 'ACTIF' },
    include: { user: { select: {
      id: true, nom: true, prenom: true, telephone: true,
      cartesVirtuelles: { orderBy: { createdAt: 'desc' }, take: 1 },
    }}},
    orderBy: { createdAt: 'asc' },
  });

  return liens.map((lien) => ({
    lien_id: lien.id,
    niveau : lien.niveau,
    user   : {
      id       : lien.user.id,
      nom      : lien.user.nom,
      prenom   : lien.user.prenom,
      telephone: lien.user.telephone,
    },
    carte: lien.user.cartesVirtuelles[0] ? _formatCarte(lien.user.cartesVirtuelles[0]) : null,
  }));
}

async function listerTout(filtres = {}) {
  const { statut, type, page = 1, limit = 50 } = filtres;
  const p     = parseInt(page, 10)  || 1;
  const l     = parseInt(limit, 10) || 50;
  const where = {};
  if (statut) where.statut = statut;
  if (type)   where.type   = type;

  const [total, items] = await Promise.all([
    prisma.carteDigi.count({ where }),
    prisma.carteDigi.findMany({
      where,
      include: { user: { select: { id: true, nom: true, prenom: true, telephone: true, statut: true } } },
      orderBy: { createdAt: 'desc' },
      skip   : (p - 1) * l,
      take   : l,
    }),
  ]);

  return { items: items.map(_formatCarte), total, page: p, totalPages: Math.ceil(total / l) };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _formatCarte(carte) {
  const { numero_hash, code_activation_hash, ...rest } = carte;
  return rest;
}

async function _verifierPropriete(userId, carteId) {
  const carte = await prisma.carteDigi.findUnique({ where: { id: carteId } });
  if (!carte || carte.user_id !== userId) {
    const err = new Error('Carte introuvable'); err.statusCode = 404; throw err;
  }
  return carte;
}

function _verifierActive(carte) {
  if (carte.statut !== 'ACTIVE') {
    const err = new Error(`Carte ${carte.statut.toLowerCase()} — opération impossible`);
    err.statusCode = 403;
    throw err;
  }
}

module.exports = {
  creerVirtuelle, getMaCarte, getCVV, getQRCode, validerQR, validerNFC,
  bloquer, debloquer, demanderPhysique, demanderPhysiqueEmployeur, activerPhysique,
  listerDemandes, validerDemande, creer, lister, listerTout,
};
