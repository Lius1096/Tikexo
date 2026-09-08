// Service admin TIKEXO
const crypto = require('crypto');
const prisma = require('../../config/database');
const { getPlatformConfig, majPlatformConfig } = require('../../utils/platformConfig');
const { normaliserTelephone, validerTelephone } = require('../../utils/telephone');
const { envoyerEmail } = require('../../utils/email');
const { invitationAdminTikexo } = require('../../utils/emailTemplates');

const ROLES_ADMIN_TIKEXO = ['SUPER_ADMIN', 'ADMIN_OPS'];

async function getConfiguration() {
  return getPlatformConfig();
}

async function majConfiguration(data) {
  return majPlatformConfig(data);
}

async function acquitterAlerteFraude(alerteId, adminId, motif) {
  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: 'ALERTE_FRAUDE_ACQUITTEE',
      entite: 'Alerte',
      entite_id: alerteId,
      apres: { motif: motif || 'Acquitté manuellement' },
    },
  });
  return { acquitte: true, alerteId };
}

async function getDashboard() {
  const [
    totalEntreprises,
    totalBeneficiaires,
    totalCommercants,
    totalTransactions,
    volumeJour,
    walletPlateforme,
  ] = await Promise.all([
    prisma.entreprise.count({ where: { statut: 'ACTIF' } }),
    prisma.user.count({ where: { role: 'BENEFICIAIRE', statut: 'ACTIF' } }),
    prisma.commercant.count({ where: { statut: 'ACTIF' } }),
    prisma.transaction.count({ where: { statut: 'VALIDEE' } }),
    prisma.transaction.aggregate({
      where: {
        statut: 'VALIDEE',
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      _sum: { montant_total: true },
    }),
    prisma.wallet.findUnique({
      where: { id: 'wallet-plateforme-tikexo' },
      select: { solde: true },
    }),
  ]);

  return {
    totalEntreprises,
    totalBeneficiaires,
    totalCommercants,
    totalTransactions,
    volumeJour: parseFloat(volumeJour._sum.montant_total || 0),
    commissionsAccumulees: parseFloat(walletPlateforme?.solde || 0),
  };
}

async function getAuditLogs({ page = 1, limit = 50, action, entite, entite_id } = {}) {
  const p = parseInt(page, 10) || 1;
  const l = parseInt(limit, 10) || 50;
  const where = {};
  if (action) where.action = action;
  if (entite) where.entite = entite;
  if (entite_id) where.entite_id = entite_id;

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { nom: true, prenom: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * l,
      take: l,
    }),
  ]);

  return { items, total, page: p, totalPages: Math.ceil(total / l) };
}

async function getUtilisateurs({ page = 1, limit = 20, role, statut } = {}) {
  const p = parseInt(page, 10) || 1;
  const l = parseInt(limit, 10) || 20;
  const where = {};
  if (role) where.role = role.includes(',') ? { in: role.split(',') } : role;
  if (statut) where.statut = statut;

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true, nom: true, prenom: true, telephone: true,
        email_perso: true, email_pro: true, role: true, statut: true, createdAt: true,
      },
      skip: (p - 1) * l,
      take: l,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { items, total, page: p, totalPages: Math.ceil(total / l) };
}

// Invite un nouveau membre de l'équipe TIKEXO (SUPER_ADMIN ou ADMIN_OPS).
// Même principe que entreprise.service.js#inviterRh : le compte est créé
// INACTIF avec un token d'invitation, et complète son profil (email
// personnel + mot de passe) via la page /invitation déjà existante — aucun
// nouveau flux d'activation à construire.
async function inviterAdminTikexo(data, invitePar) {
  if (!ROLES_ADMIN_TIKEXO.includes(data.role)) {
    const err = new Error('Rôle invalide — SUPER_ADMIN ou ADMIN_OPS uniquement');
    err.statusCode = 400; throw err;
  }

  const telephone = normaliserTelephone(data.telephone);
  if (!validerTelephone(telephone)) {
    const err = new Error('Numéro de téléphone invalide — format attendu : +229 01 XX XX XX XX');
    err.statusCode = 400; throw err;
  }
  const existantTel = await prisma.user.findUnique({ where: { telephone } });
  if (existantTel) {
    const err = new Error('Ce numéro est déjà utilisé par un autre compte TIKEXO');
    err.statusCode = 409; throw err;
  }

  const emailPro = data.email_pro?.trim();
  if (!emailPro || !emailPro.includes('@')) {
    const err = new Error('Email professionnel invalide — requis pour envoyer l\'invitation');
    err.statusCode = 400; throw err;
  }
  const existantEmail = await prisma.user.findUnique({ where: { email_pro: emailPro } });
  if (existantEmail) {
    const err = new Error('Cet email professionnel est déjà utilisé');
    err.statusCode = 409; throw err;
  }

  const token = crypto.randomBytes(32).toString('hex');

  const user = await prisma.user.create({
    data: {
      telephone,
      nom: data.nom,
      prenom: data.prenom,
      email_pro: emailPro,
      role: data.role,
      statut: 'INACTIF',
      invitation_token: token,
    },
  });

  await prisma.auditLog.create({
    data: {
      user_id: invitePar,
      action: 'INVITATION_ADMIN_TIKEXO',
      entite: 'User',
      entite_id: user.id,
      apres: { nom: data.nom, prenom: data.prenom, email_pro: emailPro, role: data.role },
    },
  });

  const frontendUrl = process.env.FRONTEND_URL || 'https://tikexo.kete.fr';
  const lienInvitation = `${frontendUrl}/invitation?token=${token}`;
  const { html, text } = invitationAdminTikexo(data.prenom, data.role, lienInvitation);
  envoyerEmail({
    to: emailPro,
    subject: 'Invitation TIKEXO — Espace admin',
    html, text,
    expediteur: 'hello',
  }).catch((err) => console.error('[EMAIL INVITATION ADMIN TIKEXO] Échec envoi vers', emailPro, err.message));

  return {
    id: user.id, nom: user.nom, prenom: user.prenom,
    email_pro: user.email_pro, role: user.role, statut: user.statut,
  };
}

async function changerRoleAdmin(userId, adminId, nouveauRole) {
  if (!ROLES_ADMIN_TIKEXO.includes(nouveauRole)) {
    const err = new Error('Rôle invalide — SUPER_ADMIN ou ADMIN_OPS uniquement');
    err.statusCode = 400; throw err;
  }
  const cible = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!ROLES_ADMIN_TIKEXO.includes(cible.role)) {
    const err = new Error('Cet utilisateur n\'est pas un compte admin TIKEXO'); err.statusCode = 400; throw err;
  }
  if (userId === adminId && nouveauRole !== 'SUPER_ADMIN') {
    const err = new Error('Vous ne pouvez pas retirer votre propre rôle de super administrateur');
    err.statusCode = 400; throw err;
  }

  await prisma.$executeRaw`UPDATE "User" SET role = ${nouveauRole}::"Role", "updatedAt" = NOW() WHERE id = ${userId}`;

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'ADMIN_TIKEXO_ROLE_MODIFIE', entite: 'User', entite_id: userId, apres: { role: nouveauRole } },
  });

  return { id: userId, role: nouveauRole };
}

async function bloquerUtilisateur(userId, adminId, motif) {
  if (userId === adminId) {
    const err = new Error('Vous ne pouvez pas bloquer votre propre compte'); err.statusCode = 400; throw err;
  }
  await prisma.$executeRaw`
    UPDATE "User" SET statut = 'BLOQUE', "updatedAt" = NOW() WHERE id = ${userId}
  `;

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: 'USER_BLOQUE',
      entite: 'User',
      entite_id: userId,
      apres: { motif },
    },
  });

  return { bloque: true };
}

async function debloquerUtilisateur(userId, adminId) {
  await prisma.$executeRaw`
    UPDATE "User" SET statut = 'ACTIF', "updatedAt" = NOW() WHERE id = ${userId}
  `;

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: 'USER_DEBLOQUE',
      entite: 'User',
      entite_id: userId,
    },
  });

  return { debloque: true };
}

async function getStatsTransactions({ periode = '7j' } = {}) {
  const jours = periode === '30j' ? 30 : periode === '90j' ? 90 : 7;
  const depuis = new Date(Date.now() - jours * 24 * 60 * 60 * 1000);

  const stats = await prisma.transaction.groupBy({
    by: ['statut'],
    where: { createdAt: { gte: depuis } },
    _count: true,
    _sum: { montant_total: true, commission_tikexo: true },
  });

  return stats;
}

async function getStatsWallets() {
  const stats = await prisma.wallet.groupBy({
    by: ['type'],
    _sum: { solde: true },
    _count: true,
  });

  return stats;
}

async function getAlertesFraude({ limit = 10 } = {}) {
  const hier = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [walletGeles, logsSuspects] = await Promise.all([
    prisma.wallet.findMany({
      where: { statut: 'GELE' },
      include: {
        user: { select: { nom: true, prenom: true, telephone: true } },
        entreprise: { select: { nom: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: Number(limit),
    }),
    prisma.auditLog.findMany({
      where: {
        action: { in: ['USER_BLOQUE', 'WALLET_GELE', 'PIN_ECHEC'] },
        createdAt: { gte: hier },
      },
      include: { user: { select: { nom: true, prenom: true, telephone: true } } },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    }),
  ]);

  const niveaux = { USER_BLOQUE: 3, WALLET_GELE: 4, PIN_ECHEC: 1 };
  const labels = { USER_BLOQUE: 'N3', WALLET_GELE: 'N4', PIN_ECHEC: 'N1' };
  const regles = {
    USER_BLOQUE: 'Blocage administratif — intervention requise',
    WALLET_GELE: 'Blocage définitif — intervention requise',
    PIN_ECHEC: 'Tentatives PIN suspectes — surveillance active',
  };

  const alertesWallets = walletGeles.map((w) => ({
    id: `wallet-${w.id}`,
    niveau: 4,
    niveauLabel: 'N4',
    description: w.user
      ? `Wallet gelé · ${w.user.prenom} ${w.user.nom} · ${w.user.telephone}`
      : w.entreprise ? `Wallet entreprise gelé · ${w.entreprise.nom}` : 'Wallet gelé',
    regle: 'Blocage définitif — intervention requise',
    createdAt: w.updatedAt,
  }));

  const alertesLogs = logsSuspects.map((log) => ({
    id: log.id,
    niveau: niveaux[log.action] || 2,
    niveauLabel: labels[log.action] || 'N2',
    description: log.user
      ? `${log.action.replace(/_/g, ' ')} · ${log.user.prenom} ${log.user.nom}`
      : `${log.action.replace(/_/g, ' ')} · ${log.entite}`,
    regle: regles[log.action] || `Action système : ${log.action}`,
    createdAt: log.createdAt,
  }));

  const all = [...alertesWallets, ...alertesLogs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, Number(limit));

  return {
    items: all,
    total: all.length,
    critiques: all.filter((a) => a.niveau >= 4).length,
  };
}

module.exports = {
  getDashboard,
  getAuditLogs,
  getUtilisateurs,
  inviterAdminTikexo,
  changerRoleAdmin,
  bloquerUtilisateur,
  debloquerUtilisateur,
  getStatsTransactions,
  getStatsWallets,
  getAlertesFraude,
  getConfiguration,
  majConfiguration,
  acquitterAlerteFraude,
};
