// Service admin TIKEXO
const crypto = require('crypto');
const prisma = require('../../config/database');
const { getPlatformConfig, majPlatformConfig } = require('../../utils/platformConfig');
const { normaliserTelephone, validerTelephone } = require('../../utils/telephone');
const { envoyerEmail, envoyerEmailAsync } = require('../../utils/email');
const { invitationAdminTikexo, broadcastAnnonce } = require('../../utils/emailTemplates');
const { logger } = require('../../middlewares/errorHandler');

const CIBLES_BROADCAST = ['BENEFICIAIRES', 'ENTREPRISES', 'COMMERCANTS'];
const TYPES_BROADCAST = ['SYSTEME', 'MARKETING'];
const CANAUX_BROADCAST = ['NOTIFICATION', 'EMAIL'];

const ROLES_ADMIN_TIKEXO = ['SUPER_ADMIN', 'ADMIN_OPS'];

// Emails personnalisables depuis /admin/email-templates (voir
// utils/emailTemplateOverride.js) — liste volontairement restreinte aux
// emails de contenu/annonce ; les emails de sécurité (OTP, réinitialisation
// mot de passe) restent codés en dur pour ne jamais casser l'authentification.
const EMAIL_TEMPLATES_META = {
  BIENVENUE_ENTREPRISE: {
    label: 'Bienvenue — nouvelle entreprise inscrite',
    variables: ['nomEntreprise', 'nomContact', 'lienConnexion'],
  },
  KYB_REJETE: {
    label: 'KYB rejeté (et rappel automatique)',
    variables: ['nomEntreprise', 'nomContact', 'motif', 'nomTypeDocument', 'lienKyb'],
  },
  KYB_APPROUVE: {
    label: 'KYB approuvé',
    variables: ['nomEntreprise', 'nomContact', 'telephone', 'lienConnexion'],
  },
};

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

// Communication de masse — entreprises sélectionnées (ou toutes), tous les
// bénéficiaires (globalement ou d'entreprises précises), ou tous les
// commerçants. Notification in-app (createMany, une requête) et/ou email
// (mis en file via envoyerEmailAsync, jamais bloquant même pour des
// milliers de destinataires).
async function envoyerBroadcast(data, adminId) {
  const { cible, titre, corps } = data;
  const entrepriseIds = Array.isArray(data.entrepriseIds) ? data.entrepriseIds : [];

  if (!titre?.trim() || !corps?.trim()) {
    const err = new Error('Titre et message requis'); err.statusCode = 400; throw err;
  }
  if (!CIBLES_BROADCAST.includes(cible)) {
    const err = new Error('Cible invalide'); err.statusCode = 400; throw err;
  }

  let where;
  if (cible === 'BENEFICIAIRES') {
    where = { role: 'BENEFICIAIRE', statut: 'ACTIF' };
    if (entrepriseIds.length) {
      where.liensBeneficiaire = { some: { entreprise_id: { in: entrepriseIds }, statut: 'ACTIF' } };
    }
  } else if (cible === 'ENTREPRISES') {
    where = {
      statut: 'ACTIF',
      entrepriseAdmin: entrepriseIds.length ? { entreprise_id: { in: entrepriseIds } } : { isNot: null },
    };
  } else {
    where = { role: 'COMMERCANT', statut: 'ACTIF' };
  }

  const destinataires = await prisma.user.findMany({
    where,
    select: { id: true, prenom: true, email_perso: true, email_pro: true },
  });

  if (destinataires.length === 0) {
    const err = new Error('Aucun destinataire ne correspond à ces critères'); err.statusCode = 400; throw err;
  }

  const type = TYPES_BROADCAST.includes(data.type) ? data.type : 'SYSTEME';
  let canaux = Array.isArray(data.canaux) ? data.canaux.filter((c) => CANAUX_BROADCAST.includes(c)) : [];
  if (canaux.length === 0) canaux = ['NOTIFICATION'];

  if (canaux.includes('NOTIFICATION')) {
    await prisma.notification.createMany({
      data: destinataires.map((d) => ({ user_id: d.id, titre: titre.trim(), corps: corps.trim(), type })),
    });
  }

  const pieceJointeUrl = data.pieceJointeUrl?.trim() || null;

  if (canaux.includes('EMAIL')) {
    for (const d of destinataires) {
      const email = d.email_perso || d.email_pro;
      if (!email) continue;
      const { html, text } = broadcastAnnonce(d.prenom, titre.trim(), corps.trim(), pieceJointeUrl);
      envoyerEmailAsync({ to: email, subject: `TIKEXO — ${titre.trim()}`, html, text })
        .catch((e) => logger.warn('TIKEXO — Email broadcast échoué', { err: e.message, to: email }));
    }
  }

  const broadcast = await prisma.broadcast.create({
    data: {
      envoye_par: adminId,
      cible,
      entreprise_ids: entrepriseIds,
      piece_jointe_url: pieceJointeUrl,
      titre: titre.trim(),
      corps: corps.trim(),
      type,
      canaux,
      nb_destinataires: destinataires.length,
    },
  });

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: 'BROADCAST_ENVOYE',
      entite: 'Broadcast',
      entite_id: broadcast.id,
      apres: { cible, nb_destinataires: destinataires.length, canaux },
    },
  });

  return broadcast;
}

async function listerBroadcasts({ page = 1, limit = 20 } = {}) {
  const p = parseInt(page, 10) || 1;
  const l = parseInt(limit, 10) || 20;

  const [total, items] = await Promise.all([
    prisma.broadcast.count(),
    prisma.broadcast.findMany({
      include: { admin: { select: { nom: true, prenom: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * l,
      take: l,
    }),
  ]);

  return { items, total, page: p, totalPages: Math.ceil(total / l) };
}

// ── Personnalisation des emails transactionnels ─────────────────────────
async function listerEmailTemplates() {
  const overrides = await prisma.emailTemplate.findMany({
    where: { cle: { in: Object.keys(EMAIL_TEMPLATES_META) } },
  });
  const parCle = new Map(overrides.map((o) => [o.cle, o]));

  return Object.entries(EMAIL_TEMPLATES_META).map(([cle, meta]) => {
    const override = parCle.get(cle);
    return {
      cle,
      label: meta.label,
      variables: meta.variables,
      personnalise: !!override,
      sujet: override?.sujet ?? null,
      corps_html: override?.corps_html ?? null,
      corps_texte: override?.corps_texte ?? null,
      updatedAt: override?.updatedAt ?? null,
    };
  });
}

async function upsertEmailTemplate(cle, data, adminId) {
  if (!EMAIL_TEMPLATES_META[cle]) {
    const err = new Error('Modèle email inconnu'); err.statusCode = 400; throw err;
  }
  if (!data.sujet?.trim() || !data.corps_html?.trim() || !data.corps_texte?.trim()) {
    const err = new Error('Sujet, corps HTML et corps texte requis'); err.statusCode = 400; throw err;
  }

  const template = await prisma.emailTemplate.upsert({
    where: { cle },
    update: { sujet: data.sujet.trim(), corps_html: data.corps_html.trim(), corps_texte: data.corps_texte.trim(), modifie_par: adminId },
    create: {
      cle, sujet: data.sujet.trim(), corps_html: data.corps_html.trim(), corps_texte: data.corps_texte.trim(),
      variables: EMAIL_TEMPLATES_META[cle].variables, modifie_par: adminId,
    },
  });

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'EMAIL_TEMPLATE_PERSONNALISE', entite: 'EmailTemplate', entite_id: cle },
  });

  return template;
}

async function supprimerEmailTemplate(cle, adminId) {
  if (!EMAIL_TEMPLATES_META[cle]) {
    const err = new Error('Modèle email inconnu'); err.statusCode = 400; throw err;
  }
  await prisma.emailTemplate.deleteMany({ where: { cle } });
  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'EMAIL_TEMPLATE_REINITIALISE', entite: 'EmailTemplate', entite_id: cle },
  });
  return { reinitialise: true };
}

// ── CGU ──────────────────────────────────────────────────────────────────
async function getCguActuelle() {
  return prisma.cGUVersion.findFirst({ orderBy: { version: 'desc' } });
}

async function listerVersionsCgu() {
  return prisma.cGUVersion.findMany({
    include: { admin: { select: { nom: true, prenom: true } } },
    orderBy: { version: 'desc' },
    take: 20,
  });
}

async function publierCgu(contenu, adminId) {
  if (!contenu?.trim()) {
    const err = new Error('Le contenu des CGU est requis'); err.statusCode = 400; throw err;
  }
  const derniere = await prisma.cGUVersion.findFirst({ orderBy: { version: 'desc' } });
  const version = await prisma.cGUVersion.create({
    data: { version: (derniere?.version ?? 0) + 1, contenu: contenu.trim(), publie_par: adminId },
  });

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'CGU_PUBLIEE', entite: 'CGUVersion', entite_id: version.id, apres: { version: version.version } },
  });

  return version;
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
  envoyerBroadcast,
  listerBroadcasts,
  listerEmailTemplates,
  upsertEmailTemplate,
  supprimerEmailTemplate,
  getCguActuelle,
  listerVersionsCgu,
  publierCgu,
};
