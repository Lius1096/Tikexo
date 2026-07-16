// Service dotation TIKEXO
// Les dotations sont des écritures internes — ZÉRO appel FedaPay
const prisma = require('../../config/database');
const { transfererEntreWallets } = require('../../utils/ledger');
const { dotationQueue } = require('../../queues/index');

async function calculer(entrepriseId, moisConcerne) {
  const mois = new Date(moisConcerne);

  const liens = await prisma.lienEntrepriseBeneficiaire.findMany({
    where: { entreprise_id: entrepriseId, statut: 'ACTIF' },
    include: { user: { select: { id: true, nom: true, prenom: true } } },
  });

  const dotations = [];

  for (const lien of liens) {
    const existing = await prisma.dotation.findUnique({
      where: { lien_id_mois_concerne: { lien_id: lien.id, mois_concerne: mois } },
    });

    if (existing) {
      dotations.push(existing);
      continue;
    }

    const montant = Math.round(parseFloat(lien.allocation_mensuelle.toString()) * 100) / 100;

    const dotation = await prisma.dotation.create({
      data: {
        entreprise_id: entrepriseId,
        beneficiaire_id: lien.user_id,
        lien_id: lien.id,
        montant_total: montant,
        mois_concerne: mois,
        statut: 'CALCULE',
      },
    });

    dotations.push(dotation);
  }

  return { dotations, mois: moisConcerne };
}

async function valider(dotationIds, adminId) {
  const dotations = await prisma.dotation.findMany({
    where: { id: { in: dotationIds }, statut: 'CALCULE' },
  });

  if (dotations.length === 0) {
    const err = new Error('Aucune dotation CALCULÉE à valider');
    err.statusCode = 400;
    throw err;
  }

  await Promise.all(
    dotations.map((d) =>
      prisma.$executeRaw`
        UPDATE "Dotation"
        SET statut = 'VALIDE', valide_par = ${adminId}, valide_at = NOW()
        WHERE id = ${d.id} AND statut = 'CALCULE'
      `
    )
  );

  // Réserver les montants sur le wallet de chaque entreprise
  const parEntreprise = dotations.reduce((acc, d) => {
    if (!acc[d.entreprise_id]) acc[d.entreprise_id] = 0;
    acc[d.entreprise_id] += parseFloat(d.montant_total.toString());
    return acc;
  }, {});

  await Promise.all(
    Object.entries(parEntreprise).map(([entrepriseId, montant]) =>
      prisma.$executeRaw`
        UPDATE "Wallet"
        SET solde_reserve = solde_reserve + ${montant}::numeric, "updatedAt" = NOW()
        WHERE entreprise_id = ${entrepriseId}
      `
    )
  );

  return { validees: dotations.length };
}

// Distribue en queue — 1 job par dotation, max 10 simultanés (concurrency du worker)
async function distribuer(dotationIds, adminId) {
  const dotations = await prisma.dotation.findMany({
    where: { id: { in: dotationIds }, statut: 'VALIDE' },
  });

  if (dotations.length === 0) {
    const err = new Error('Aucune dotation VALIDÉE à distribuer');
    err.statusCode = 400;
    throw err;
  }

  // Grouper par entreprise pour vérifier le solde avant d'enqueuer
  const parEntreprise = dotations.reduce((acc, d) => {
    if (!acc[d.entreprise_id]) acc[d.entreprise_id] = { total: 0, dotations: [] };
    acc[d.entreprise_id].total += parseFloat(d.montant_total.toString());
    acc[d.entreprise_id].dotations.push(d);
    return acc;
  }, {});

  for (const [entrepriseId, { total }] of Object.entries(parEntreprise)) {
    const walletEntreprise = await prisma.wallet.findUniqueOrThrow({
      where: { entreprise_id: entrepriseId },
    });
    const solde = parseFloat(walletEntreprise.solde.toString());
    if (solde < total) {
      const err = new Error(
        `Solde insuffisant — requis: ${total} XOF, disponible: ${solde} XOF`
      );
      err.statusCode = 422;
      err.code = 'SOLDE_INSUFFISANT';
      throw err;
    }
  }

  // Enqueuer 1 job par dotation — le worker les traite 10 par 10
  const jobs = [];
  for (const dotation of dotations) {
    const walletEntreprise = await prisma.wallet.findUniqueOrThrow({
      where: { entreprise_id: dotation.entreprise_id },
    });
    const walletBenef = await prisma.wallet.findUniqueOrThrow({
      where: { user_id: dotation.beneficiaire_id },
    });

    jobs.push({
      name: 'distribuer-dotation',
      data: {
        dotationId: dotation.id,
        beneficiaireId: dotation.beneficiaire_id,
        walletEntrepriseId: walletEntreprise.id,
        walletBenefId: walletBenef.id,
        montant: parseFloat(dotation.montant_total.toString()),
        entrepriseId: dotation.entreprise_id,
      },
    });
  }

  await dotationQueue.addBulk(jobs);

  return { enqueued: jobs.length, dotationIds };
}

async function lister(filtres = {}) {
  const { entrepriseId, statut, beneficiaireId } = filtres;
  const p = parseInt(filtres.page, 10) || 1;
  const l = parseInt(filtres.limit, 10) || 20;
  const where = {};
  if (entrepriseId) where.entreprise_id = entrepriseId;
  if (statut) where.statut = statut;
  if (beneficiaireId) where.beneficiaire_id = beneficiaireId;

  const [total, items] = await Promise.all([
    prisma.dotation.count({ where }),
    prisma.dotation.findMany({
      where,
      include: {
        lien: {
          include: {
            user: { select: { id: true, nom: true, prenom: true, telephone: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * l,
      take: l,
    }),
  ]);

  return { items, total, page: p, totalPages: Math.ceil(total / l) };
}

async function getById(id) {
  return prisma.dotation.findUniqueOrThrow({
    where: { id },
    include: { lien: { include: { user: true, entreprise: true } } },
  });
}

async function ignorer(dotationIds, adminId) {
  const dotations = await prisma.dotation.findMany({
    where: { id: { in: dotationIds }, statut: 'CALCULE' },
  });

  if (dotations.length === 0) {
    const err = new Error('Aucune dotation CALCULÉE à ignorer');
    err.statusCode = 400;
    throw err;
  }

  await Promise.all(
    dotations.map((d) =>
      prisma.$executeRaw`
        UPDATE "Dotation" SET statut = 'IGNORE' WHERE id = ${d.id} AND statut = 'CALCULE'
      `
    )
  );

  return { ignorees: dotations.length };
}

module.exports = { calculer, valider, distribuer, ignorer, lister, getById };
