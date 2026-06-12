// Service dotation TIKEXO
// Les dotations sont des écritures internes — ZÉRO appel FedaPay
const prisma = require('../../config/database');
const { transfererEntreWallets } = require('../../utils/ledger');
const { compterJoursOuvresMois } = require('../../utils/jours-feries-benin');
const { envoyerNotificationPush } = require('../../config/firebase');

async function calculer(entrepriseId, moisConcerne) {
  const mois = new Date(moisConcerne);
  const annee = mois.getFullYear();
  const moisNum = mois.getMonth() + 1;
  const joursOuvres = compterJoursOuvresMois(annee, moisNum);

  const liens = await prisma.lienEntrepriseBeneficiaire.findMany({
    where: { entreprise_id: entrepriseId, statut: 'ACTIF' },
    include: { user: { select: { id: true, nom: true, prenom: true } } },
  });

  const dotations = [];

  for (const lien of liens) {
    // Vérifier qu'une dotation n'existe pas déjà pour ce mois
    const existing = await prisma.dotation.findUnique({
      where: { lien_id_mois_concerne: { lien_id: lien.id, mois_concerne: mois } },
    });

    if (existing) {
      dotations.push(existing);
      continue;
    }

    const valeurTitre = parseFloat(lien.valeur_titre.toString());
    const tauxParticipation = parseFloat(lien.taux_participation.toString()) / 100;
    const nbTitres = joursOuvres;
    const montantTotal = valeurTitre * nbTitres;
    const partEmployeur = Math.round(montantTotal * tauxParticipation * 100) / 100;
    const partSalarie = Math.round((montantTotal - partEmployeur) * 100) / 100;

    const dotation = await prisma.dotation.create({
      data: {
        entreprise_id: entrepriseId,
        beneficiaire_id: lien.user_id,
        lien_id: lien.id,
        nb_titres: nbTitres,
        montant_total: montantTotal,
        part_employeur: partEmployeur,
        part_salarie: partSalarie,
        mois_concerne: mois,
        statut: 'CALCULE',
      },
    });

    dotations.push(dotation);
  }

  return { dotations, joursOuvres, mois: moisConcerne };
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
    acc[d.entreprise_id] += parseFloat(d.part_employeur.toString());
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

async function distribuer(dotationIds, adminId) {
  const dotations = await prisma.dotation.findMany({
    where: { id: { in: dotationIds }, statut: 'VALIDE' },
  });

  if (dotations.length === 0) {
    const err = new Error('Aucune dotation VALIDÉE à distribuer');
    err.statusCode = 400;
    throw err;
  }

  // Grouper par entreprise pour vérifier le solde
  const parEntreprise = dotations.reduce((acc, d) => {
    if (!acc[d.entreprise_id]) acc[d.entreprise_id] = { total: 0, dotations: [] };
    acc[d.entreprise_id].total += parseFloat(d.part_employeur.toString());
    acc[d.entreprise_id].dotations.push(d);
    return acc;
  }, {});

  const resultats = [];

  for (const [entrepriseId, { total, dotations: dList }] of Object.entries(parEntreprise)) {
    const walletEntreprise = await prisma.wallet.findUniqueOrThrow({
      where: { entreprise_id: entrepriseId },
    });

    const solde = parseFloat(walletEntreprise.solde.toString());
    if (solde < total) {
      const err = new Error(
        `Solde insuffisant pour l'entreprise — requis: ${total} XOF, disponible: ${solde} XOF`
      );
      err.statusCode = 422;
      err.code = 'SOLDE_INSUFFISANT';
      throw err;
    }

    // Distribuer chaque dotation — ZÉRO appel FedaPay
    for (const dotation of dList) {
      const walletBenef = await prisma.wallet.findUniqueOrThrow({
        where: { user_id: dotation.beneficiaire_id },
      });

      const montant = parseFloat(dotation.part_employeur.toString());

      // Transfert interne : wallet entreprise → wallet bénéficiaire (débite solde)
      await transfererEntreWallets(
        prisma,
        walletEntreprise.id,
        walletBenef.id,
        montant,
        'DOTATION',
        { dotation_id: dotation.id, source_entreprise_id: entrepriseId }
      );

      // Libérer la réserve correspondante
      await prisma.$executeRaw`
        UPDATE "Wallet"
        SET solde_reserve = GREATEST(0, solde_reserve - ${montant}::numeric), "updatedAt" = NOW()
        WHERE id = ${walletEntreprise.id}
      `;

      await prisma.$executeRaw`
        UPDATE "Dotation"
        SET statut = 'DISTRIBUE', distribue_at = NOW()
        WHERE id = ${dotation.id}
      `;

      // Notification push bénéficiaire
      const user = await prisma.user.findUnique({
        where: { id: dotation.beneficiaire_id },
        select: { fcm_token: true },
      });

      if (user?.fcm_token) {
        envoyerNotificationPush(
          user.fcm_token,
          'Dotation TIKEXO reçue',
          `Votre dotation de ${dotation.part_employeur} XOF a été créditée sur votre wallet TIKEXO`
        ).catch(() => {});
      }

      resultats.push({ dotation_id: dotation.id, statut: 'DISTRIBUE' });
    }
  }

  return resultats;
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

module.exports = { calculer, valider, distribuer, lister, getById };
