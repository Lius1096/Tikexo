// Service entreprise TIKEXO
const prisma = require('../../config/database');
const crypto = require('crypto');
const { validerKYCViaBeneficiaire } = require('../../utils/kyc');
const { normaliserTelephone } = require('../../utils/telephone');
const { envoyerEmail } = require('../../utils/email');
const { invitationRh } = require('../../utils/emailTemplates');
const { invaliderCacheUser } = require('../../middlewares/auth');

async function lister(filtres = {}) {
  const { statut, q } = filtres;
  const p = parseInt(filtres.page, 10) || 1;
  const l = parseInt(filtres.limit, 10) || 20;
  const where = {
    ...(statut ? { statut } : {}),
    ...(q?.trim() ? { OR: [
      { nom: { contains: q.trim(), mode: 'insensitive' } },
      { nif: { contains: q.trim(), mode: 'insensitive' } },
    ] } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.entreprise.count({ where }),
    prisma.entreprise.findMany({
      where,
      include: {
        wallet: { select: { solde: true, currency: true } },
        _count: { select: { liensBeneficiaires: { where: { statut: 'ACTIF' } } } },
      },
      skip: (p - 1) * l,
      take: l,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Volume de transactions du mois en cours, par entreprise source — une seule requête groupée
  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);

  const volumes = await prisma.transaction.groupBy({
    by: ['source_entreprise_id'],
    where: {
      source_entreprise_id: { in: items.map((e) => e.id) },
      statut: { not: 'ANNULEE' },
      createdAt: { gte: debutMois },
    },
    _sum: { montant_total: true },
  });
  const volumeParEntreprise = new Map(
    volumes.map((v) => [v.source_entreprise_id, parseFloat(v._sum.montant_total || 0)])
  );

  return {
    items: items.map((e) => ({ ...e, volumeMois: volumeParEntreprise.get(e.id) ?? 0 })),
    total,
    page: p,
    totalPages: Math.ceil(total / l),
  };
}

async function creer(data) {
  const entreprise = await prisma.entreprise.create({
    data: {
      nom: data.nom,
      nif: data.nif,
      rccm: data.rccm,
      secteur: data.secteur,
      adresse: data.adresse,
      ville: data.ville || 'Cotonou',
      telephone_rh: data.telephone_rh,
      email_rh: data.email_rh,
      taux_commission_defaut: data.taux_commission_defaut || 5.00,
    },
  });

  // Créer le wallet entreprise
  await prisma.wallet.create({
    data: {
      entreprise_id: entreprise.id,
      type: 'ENTREPRISE',
      currency: 'XOF',
    },
  });

  return entreprise;
}

async function getById(id) {
  return prisma.entreprise.findUniqueOrThrow({
    where: { id },
    include: {
      wallet: true,
      _count: { select: { liensBeneficiaires: { where: { statut: 'ACTIF' } } } },
    },
  });
}

async function modifier(id, data) {
  // email_perso immuable — pas de modification possible via cette API
  const { nif, ...updateData } = data;
  return prisma.entreprise.update({
    where: { id },
    data: updateData,
  });
}

async function validerKYB(entrepriseId, adminId) {
  const entreprise = await prisma.entreprise.update({
    where: { id: entrepriseId },
    data: { kyb_valide: true, statut: 'ACTIF' },
  });

  // Cascader le KYC sur tous les bénéficiaires rattachés actifs
  const liens = await prisma.lienEntrepriseBeneficiaire.findMany({
    where: { entreprise_id: entrepriseId, statut: 'ACTIF' },
  });

  await Promise.all(
    liens.map((lien) => validerKYCViaBeneficiaire(prisma, lien.user_id, entrepriseId))
  );

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: 'KYB_VALIDE',
      entite: 'Entreprise',
      entite_id: entrepriseId,
    },
  });

  return entreprise;
}

async function suspendre(entrepriseId, adminId) {
  const entreprise = await prisma.entreprise.update({
    where: { id: entrepriseId },
    data: { statut: 'SUSPENDU' },
  });

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: 'ENTREPRISE_SUSPENDUE',
      entite: 'Entreprise',
      entite_id: entrepriseId,
    },
  });

  return entreprise;
}

// "Supprimer" = archivage (soft-delete) — une entreprise a des wallets, dotations,
// transactions liées ; une suppression physique casserait l'intégrité référentielle
// et l'historique financier. ARCHIVE existe déjà dans StatutEntreprise pour ça.
async function archiver(entrepriseId, adminId) {
  const entreprise = await prisma.entreprise.update({
    where: { id: entrepriseId },
    data: { statut: 'ARCHIVE' },
  });

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: 'ENTREPRISE_ARCHIVEE',
      entite: 'Entreprise',
      entite_id: entrepriseId,
    },
  });

  return entreprise;
}

async function getBeneficiaires(entrepriseId) {
  const liens = await prisma.lienEntrepriseBeneficiaire.findMany({
    where: { entreprise_id: entrepriseId },
    include: {
      user: {
        select: {
          id: true, nom: true, prenom: true, telephone: true,
          email_perso: true, statut: true,
          wallet: { select: { solde: true, currency: true } },
          cartesVirtuelles: {
            where: { statut: { not: 'EXPIREE' } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, type: true, statut: true, numero_masque: true, date_expiration: true, nfc_active: true },
          },
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true },
          },
        },
      },
      dotations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { montant_total: true, mois_concerne: true, statut: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return liens.map((l) => ({
    ...l,
    user: {
      ...l.user,
      carte: l.user.cartesVirtuelles?.[0] ?? null,
      derniereActivite: l.user.transactions?.[0]?.createdAt ?? null,
      cartesVirtuelles: undefined,
      transactions: undefined,
    },
    derniereDotation: l.dotations?.[0] ?? null,
    dotations: undefined,
  }));
}

async function getWallet(entrepriseId) {
  return prisma.wallet.findUniqueOrThrow({
    where: { entreprise_id: entrepriseId },
    include: {
      ledgerSorties: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

async function getEquipeRH(entrepriseId) {
  return prisma.entrepriseAdmin.findMany({
    where: { entreprise_id: entrepriseId },
    select: {
      id: true, role: true, matricule: true, createdAt: true,
      user: {
        select: {
          id: true, nom: true, prenom: true, telephone: true,
          email_pro: true, statut: true, createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

async function inviterRh(entrepriseId, data, adminId) {
  const telephone = normaliserTelephone(data.telephone);

  const existantTel = await prisma.user.findUnique({ where: { telephone } });
  if (existantTel) {
    const err = new Error('Ce numéro est déjà utilisé par un autre compte TIKEXO');
    err.statusCode = 409;
    throw err;
  }

  const emailPro = data.email_pro?.trim();
  if (!emailPro) {
    const err = new Error('Email professionnel requis pour envoyer l\'invitation');
    err.statusCode = 400;
    throw err;
  }
  const existantEmail = await prisma.user.findUnique({ where: { email_pro: emailPro } });
  if (existantEmail) {
    const err = new Error('Cet email professionnel est déjà utilisé');
    err.statusCode = 409;
    throw err;
  }

  const matricule = data.matricule?.trim() || null;
  if (matricule) {
    const matriculeExistant = await prisma.entrepriseAdmin.findFirst({
      where: { entreprise_id: entrepriseId, matricule },
    });
    if (matriculeExistant) {
      const err = new Error('Ce matricule est déjà utilisé dans cette entreprise');
      err.statusCode = 409;
      throw err;
    }
  }

  const entreprise = await prisma.entreprise.findUniqueOrThrow({
    where: { id: entrepriseId },
    select: { nom: true },
  });

  const token = crypto.randomBytes(32).toString('hex');
  const user = await prisma.user.create({
    data: {
      telephone,
      nom: data.nom,
      prenom: data.prenom,
      email_pro: emailPro,
      role: 'GESTIONNAIRE_RH',
      statut: 'INACTIF',
      invitation_token: token,
    },
  });

  const entrepriseAdmin = await prisma.entrepriseAdmin.create({
    data: { entreprise_id: entrepriseId, user_id: user.id, role: 'GESTIONNAIRE_RH', matricule },
  });

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: 'INVITATION_RH',
      entite: 'EntrepriseAdmin',
      entite_id: entrepriseAdmin.id,
      apres: { nom: data.nom, prenom: data.prenom, email_pro: emailPro, matricule },
    },
  });

  const frontendUrl = process.env.FRONTEND_URL || 'https://tikexo.vercel.app';
  const lienInvitation = `${frontendUrl}/invitation?token=${token}`;
  const { html, text } = invitationRh(data.prenom, entreprise.nom, lienInvitation);
  envoyerEmail({
    to: emailPro,
    subject: `Invitation TIKEXO — ${entreprise.nom}`,
    html, text,
    expediteur: 'hello',
  }).catch(err => console.error('[EMAIL INVITATION RH] Échec envoi vers', emailPro, err.message));

  return {
    id: user.id, nom: user.nom, prenom: user.prenom, telephone: user.telephone,
    email_pro: user.email_pro, matricule, role: 'GESTIONNAIRE_RH', statut: 'INACTIF',
  };
}

async function retirerRh(entrepriseId, userId, adminId) {
  const cible = await prisma.entrepriseAdmin.findFirst({
    where: { entreprise_id: entrepriseId, user_id: userId },
  });
  if (!cible) {
    const err = new Error('Ce compte RH n\'appartient pas à cette entreprise');
    err.statusCode = 404;
    throw err;
  }
  if (cible.role === 'ADMIN_RH') {
    const err = new Error('Impossible de retirer le compte RH principal de l\'entreprise');
    err.statusCode = 403;
    throw err;
  }

  await prisma.user.update({ where: { id: userId }, data: { statut: 'BLOQUE' } });
  await invaliderCacheUser(userId);

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: 'RETRAIT_RH',
      entite: 'EntrepriseAdmin',
      entite_id: cible.id,
      apres: { statut: 'BLOQUE' },
    },
  });

  return { id: userId, statut: 'BLOQUE' };
}

async function toggleStatutUser(userId, adminId) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const nouveauStatut = user.statut === 'BLOQUE' ? 'ACTIF' : 'BLOQUE';

  await prisma.user.update({ where: { id: userId }, data: { statut: nouveauStatut } });
  await invaliderCacheUser(userId);

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: nouveauStatut === 'BLOQUE' ? 'USER_BLOQUE' : 'USER_REACTIVE',
      entite: 'User',
      entite_id: userId,
    },
  });

  return { id: userId, statut: nouveauStatut };
}

// Tous statuts (actif, inactif, bloqué) — pour le comptage complet
async function getBeneficiairesComplet(entrepriseId) {
  return prisma.lienEntrepriseBeneficiaire.findMany({
    where: { entreprise_id: entrepriseId },
    include: {
      user: {
        select: {
          id: true, nom: true, prenom: true, telephone: true,
          email_perso: true, statut: true,
          wallet: { select: { id: true, solde: true, currency: true } },
        },
      },
    },
  });
}

async function getStats(entrepriseId) {
  const anneeCourante = new Date().getFullYear();
  const debutAnnee = new Date(anneeCourante, 0, 1);

  // Comptes bénéficiaires par statut user
  const [total, actifs, enAttente] = await Promise.all([
    prisma.lienEntrepriseBeneficiaire.count({ where: { entreprise_id: entrepriseId } }),
    prisma.lienEntrepriseBeneficiaire.count({
      where: { entreprise_id: entrepriseId, user: { statut: 'ACTIF' } },
    }),
    prisma.lienEntrepriseBeneficiaire.count({
      where: { entreprise_id: entrepriseId, user: { statut: 'INACTIF' } },
    }),
  ]);

  // Dotations distribuées cette année — YTD
  const dotationsAnnee = await prisma.dotation.findMany({
    where: {
      entreprise_id: entrepriseId,
      statut: 'DISTRIBUE',
      distribue_at: { gte: debutAnnee },
    },
    select: { montant_total: true, distribue_at: true },
  });

  const consommationYTD = dotationsAnnee.reduce((s, d) => s + parseFloat(d.montant_total), 0);

  // Agrégation par mois de l'année courante (indices 0-11)
  const parMois = Array.from({ length: 12 }, (_, i) => ({ mois: i, total: 0 }));
  for (const d of dotationsAnnee) {
    const m = new Date(d.distribue_at).getMonth();
    parMois[m].total += parseFloat(d.montant_total);
  }

  // Top 5 consommateurs — transactions par bénéficiaire de cette entreprise YTD
  const liens = await prisma.lienEntrepriseBeneficiaire.findMany({
    where: { entreprise_id: entrepriseId, statut: 'ACTIF' },
    select: {
      user: { select: { id: true, nom: true, prenom: true, wallet: { select: { id: true } } } },
    },
  });

  const beneficiaireIds = liens.map((l) => l.user.id);
  const walletToUser = new Map(
    liens
      .filter((l) => l.user.wallet?.id)
      .map((l) => [l.user.id, l.user])
  );

  const topTx = await prisma.transaction.groupBy({
    by: ['beneficiaire_id'],
    where: {
      beneficiaire_id: { in: beneficiaireIds },
      statut: { not: 'ANNULEE' },
      createdAt: { gte: debutAnnee },
    },
    _sum: { montant_total: true },
    _count: { id: true },
    orderBy: { _sum: { montant_total: 'desc' } },
    take: 5,
  });

  const topConsommateurs = topTx
    .map((t) => ({
      user: walletToUser.get(t.beneficiaire_id),
      total: parseFloat(t._sum.montant_total || 0),
      nb_transactions: t._count.id,
    }))
    .filter((t) => t.user);

  return { beneficiaires: { total, actifs, enAttente }, consommationYTD, parMois, topConsommateurs };
}

async function getFacturation(entrepriseId) {
  const wallet = await prisma.wallet.findUnique({
    where: { entreprise_id: entrepriseId },
    select: { id: true },
  });
  if (!wallet) return { items: [], total: 0 };

  const items = await prisma.ledgerEntry.findMany({
    where: { wallet_source_id: wallet.id, type: 'FRAIS_GESTION' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, montant: true, createdAt: true, metadata: true },
  });

  return { items, total: items.length };
}

module.exports = { lister, creer, getById, modifier, validerKYB, suspendre, archiver, getBeneficiaires, getBeneficiairesComplet, getWallet, getEquipeRH, inviterRh, retirerRh, toggleStatutUser, getStats, getFacturation };
