// Service mutation TIKEXO — TIKEXO internal only, aucun employeur ne voit l'autre
const prisma = require('../../config/database');
const { calculerSoldeSegmente } = require('../../utils/ledger');
const { cascadeKYCApresDepart, validerKYCViaBeneficiaire } = require('../../utils/kyc');
const { declencherPayout } = require('../fedapay/fedapay.service');

const JOURS_LIMBO = 90;

/**
 * Appelé par ADMIN_RH de A quand un employé quitte.
 * Crée la mutation interne TIKEXO — invisible pour B.
 */
async function traiterSortie(userId, entrepriseId, adminId, { optionSolde }) {
  const lien = await prisma.lienEntrepriseBeneficiaire.findFirst({
    where: { user_id: userId, entreprise_id: entrepriseId, statut: 'ACTIF' },
  });

  if (!lien) {
    const err = new Error('Aucun lien actif trouvé pour cet employé dans cette entreprise');
    err.statusCode = 404;
    throw err;
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email_pro: true, wallet: { select: { id: true, solde: true } } },
  });

  // Calculer le solde venant de l'entreprise A
  const soldeSegmente = await calculerSoldeSegmente(prisma, userId);
  const partA = soldeSegmente.sources?.find((s) => s.entreprise_id === entrepriseId);
  const montantConcerne = parseFloat(partA?.montant || 0);

  const archivePlanifieAt = new Date();
  archivePlanifieAt.setDate(archivePlanifieAt.getDate() + JOURS_LIMBO);

  await prisma.$transaction(async (tx) => {
    // Fermer le lien
    await tx.$executeRaw`
      UPDATE "LienEntrepriseBeneficiaire"
      SET statut = 'TERMINE', date_fin = NOW(), "updatedAt" = NOW()
      WHERE id = ${lien.id}
    `;

    // Créer la mutation interne TIKEXO
    await tx.mutation.create({
      data: {
        user_id: userId,
        entreprise_a_id: entrepriseId,
        lien_a_id: lien.id,
        option_solde: optionSolde,
        montant_rembourse: montantConcerne > 0 ? montantConcerne : null,
        email_pro_avant: user.email_pro || null,
        date_depart_a: new Date(),
        archive_planifie_at: archivePlanifieAt,
        statut: 'EN_ATTENTE',
      },
    });

    // Effacer email_pro — sera remis à jour par TIKEXO lors du TRAITE
    await tx.$executeRaw`
      UPDATE "User" SET email_pro = NULL, "updatedAt" = NOW() WHERE id = ${userId}
    `;

    await tx.auditLog.create({
      data: {
        user_id: adminId,
        action: 'SORTIE_EMPLOYE',
        entite: 'LienEntrepriseBeneficiaire',
        entite_id: lien.id,
        apres: { optionSolde, montantConcerne, userId },
      },
    });
  });

  // Cascade KYC après départ
  await cascadeKYCApresDepart(prisma, userId);

  // Si remboursement, déclencher payout FedaPay
  if (optionSolde === 'REMBOURSEMENT' && montantConcerne > 0) {
    try {
      await declencherPayout(prisma, {
        userId,
        montant: montantConcerne,
        entrepriseId,
        motif: 'Remboursement départ employé',
      });
    } catch (e) {
      // Non-bloquant — le payout peut être retenté plus tard
    }
  }

  return { sortie: true, optionSolde, montantConcerne };
}

/**
 * Appelé automatiquement quand B rattache un employé qui avait une mutation EN_ATTENTE.
 * Lie la mutation au nouveau lien — invisible pour B.
 */
async function detecterRattachement(userId, lienBId, entrepriseBId) {
  const mutation = await prisma.mutation.findFirst({
    where: { user_id: userId, statut: 'EN_ATTENTE' },
    orderBy: { createdAt: 'desc' },
  });

  if (!mutation) return null;

  await prisma.$executeRaw`
    UPDATE "Mutation"
    SET statut = 'DETECTE',
        entreprise_b_id = ${entrepriseBId},
        lien_b_id = ${lienBId},
        "updatedAt" = NOW()
    WHERE id = ${mutation.id}
  `;

  await prisma.auditLog.create({
    data: {
      action: 'MUTATION_DETECTEE',
      entite: 'Mutation',
      entite_id: mutation.id,
      apres: { entrepriseBId, lienBId },
    },
  });

  return mutation.id;
}

/**
 * TIKEXO admin traite la mutation : met à jour email_pro et envoie le mail de bienvenue.
 */
async function traiter(mutationId, adminId, { emailProApres }) {
  const mutation = await prisma.mutation.findUniqueOrThrow({
    where: { id: mutationId },
    include: { user: { select: { id: true, nom: true, prenom: true } }, entrepriseB: { select: { nom: true } } },
  });

  if (mutation.statut !== 'DETECTE') {
    const err = new Error('La mutation doit être au statut DETECTE pour être traitée');
    err.statusCode = 400;
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    // Mettre à jour email_pro — email_perso reste immuable
    if (emailProApres) {
      await tx.$executeRaw`
        UPDATE "User" SET email_pro = ${emailProApres}, "updatedAt" = NOW()
        WHERE id = ${mutation.user_id}
      `;
    }

    await tx.$executeRaw`
      UPDATE "Mutation"
      SET statut = 'TRAITE',
          email_pro_apres = ${emailProApres || null},
          traite_par = ${adminId},
          traite_at = NOW(),
          "updatedAt" = NOW()
      WHERE id = ${mutationId}
    `;

    await tx.auditLog.create({
      data: {
        user_id: adminId,
        action: 'MUTATION_TRAITEE',
        entite: 'Mutation',
        entite_id: mutationId,
        apres: { emailProApres },
      },
    });
  });

  // TODO: envoyer email de bienvenue à emailProApres (quand infrastructure email disponible)

  return { traite: true, emailProApres };
}

/**
 * Expire les mutations dont le limbo de 90 jours est dépassé.
 * Appelé par un cron job quotidien.
 */
async function archiverExpirees() {
  const mutations = await prisma.mutation.findMany({
    where: { statut: 'EN_ATTENTE', archive_planifie_at: { lte: new Date() } },
    select: { id: true, user_id: true },
  });

  for (const m of mutations) {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "Mutation" SET statut = 'EXPIRE', "updatedAt" = NOW() WHERE id = ${m.id}
      `;
      await tx.$executeRaw`
        UPDATE "User" SET statut = 'ARCHIVE', "updatedAt" = NOW() WHERE id = ${m.user_id}
      `;
      await tx.auditLog.create({
        data: {
          action: 'MUTATION_EXPIREE',
          entite: 'Mutation',
          entite_id: m.id,
          apres: { userId: m.user_id, raison: 'Limbo 90 jours dépassé' },
        },
      });
    });
  }

  return { expires: mutations.length };
}

async function lister(filtres = {}) {
  const { statut } = filtres;
  const p = parseInt(filtres.page, 10) || 1;
  const l = parseInt(filtres.limit, 10) || 20;
  const where = statut ? { statut } : {};

  const [total, items] = await Promise.all([
    prisma.mutation.count({ where }),
    prisma.mutation.findMany({
      where,
      include: {
        user: { select: { nom: true, prenom: true, telephone: true, email_pro: true } },
        entrepriseA: { select: { nom: true, ville: true } },
        entrepriseB: { select: { nom: true, ville: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * l,
      take: l,
    }),
  ]);

  return { items, total, page: p, totalPages: Math.ceil(total / l) };
}

async function getById(id) {
  return prisma.mutation.findUniqueOrThrow({
    where: { id },
    include: {
      user: { select: { nom: true, prenom: true, telephone: true, email_pro: true, email_perso: true } },
      entrepriseA: { select: { nom: true, ville: true } },
      entrepriseB: { select: { nom: true, ville: true } },
    },
  });
}

module.exports = { traiterSortie, detecterRattachement, traiter, archiverExpirees, lister, getById };
