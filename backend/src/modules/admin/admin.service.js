// Service admin TIKEXO
const prisma = require('../../config/database');
const path = require('path');
const fs = require('fs');

const CONFIG_PATH = path.join(__dirname, '../../../../platform-config.json');

const CONFIG_DEFAUT = {
  taux_frais_benef:      0.05,
  taux_frais_commercant: 0.05,
  plafond_journalier:    10000,
  seuil_payout_minimum:  1000,
  seuil_anti_fraude:     3,
};

function lireConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return { ...CONFIG_DEFAUT, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) };
    }
  } catch {}
  return { ...CONFIG_DEFAUT };
}

function ecrireConfig(data) {
  const config = { ...lireConfig(), ...data };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  return config;
}

async function getConfiguration() {
  return lireConfig();
}

async function majConfiguration(data) {
  const champs = ['taux_frais_benef', 'taux_frais_commercant', 'plafond_journalier', 'seuil_payout_minimum', 'seuil_anti_fraude'];
  const update = {};
  for (const c of champs) {
    if (data[c] !== undefined) update[c] = parseFloat(data[c]);
  }
  return ecrireConfig(update);
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
  if (role) where.role = role;
  if (statut) where.statut = statut;

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true, nom: true, prenom: true, telephone: true,
        email_perso: true, role: true, statut: true, createdAt: true,
      },
      skip: (p - 1) * l,
      take: l,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { items, total, page: p, totalPages: Math.ceil(total / l) };
}

async function bloquerUtilisateur(userId, adminId, motif) {
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
  bloquerUtilisateur,
  debloquerUtilisateur,
  getStatsTransactions,
  getStatsWallets,
  getAlertesFraude,
  getConfiguration,
  majConfiguration,
  acquitterAlerteFraude,
};
