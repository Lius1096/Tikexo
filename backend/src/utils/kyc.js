// Logique KYC simplifiée TIKEXO
// Règle : KYC uniquement pour ceux qui reçoivent de l'argent réel (commerçants KYB)
// Les bénéficiaires salariés sont couverts par le KYB de leur entreprise

const { envoyerNotificationPush } = require('../config/firebase');

/**
 * Valide le KYC d'un bénéficiaire via son entreprise.
 * Appelé automatiquement à la création d'un LienEntrepriseBeneficiaire.
 */
async function validerKYCViaBeneficiaire(prisma, userId, entrepriseId) {
  const entreprise = await prisma.entreprise.findUniqueOrThrow({
    where: { id: entrepriseId },
  });

  if (!entreprise.kyb_valide) {
    const err = new Error(
      `TIKEXO — KYC refusé : entreprise ${entrepriseId} n'a pas de KYB validé`
    );
    err.code = 'KYB_NON_VALIDE';
    throw err;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      kyc_via_entreprise: true,
      kyc_niveau: 'ZERO',
      statut: 'ACTIF',
    },
  });

  return { kyc_valide: true, methode: 'VIA_ENTREPRISE', entreprise_id: entrepriseId };
}

/**
 * Met à jour le KYC après départ d'entreprise.
 * Appelé quand un lien passe à TERMINE.
 * Le bénéficiaire conserve ses droits sur son solde résiduel.
 */
async function cascadeKYCApresDepart(prisma, userId) {
  const liensActifs = await prisma.lienEntrepriseBeneficiaire.count({
    where: {
      user_id: userId,
      statut: 'ACTIF',
    },
  });

  if (liensActifs === 0) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        kyc_via_entreprise: false,
        // kyc_niveau reste ZERO — le solde résiduel est de l'argent déjà tracé
        email_pro: null,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcm_token: true },
    });

    if (user?.fcm_token) {
      await envoyerNotificationPush(
        user.fcm_token,
        'Votre compte TIKEXO',
        'Vous pouvez continuer à utiliser votre solde TIKEXO même après votre départ.'
      ).catch(() => {});
    }

    // Créer une notification en base
    await prisma.notification.create({
      data: {
        user_id: userId,
        titre: 'Votre compte TIKEXO',
        corps: 'Vous pouvez continuer à utiliser votre solde TIKEXO. Votre email personnel reste votre identifiant.',
        type: 'SYSTEME',
      },
    });
  }

  return { liensActifsRestants: liensActifs };
}

/**
 * Vérifie si un utilisateur est autorisé à effectuer une transaction.
 * La logique : ZERO KYC pour bénéficiaires, blocage uniquement sur statut compte.
 */
async function verifierAccesTransaction(prisma, userId) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      wallet: true,
    },
  });

  if (user.statut === 'BLOQUE' || user.statut === 'ARCHIVE') {
    return {
      autorise: false,
      motif: `Compte ${user.statut.toLowerCase()} — contacter le support TIKEXO`,
    };
  }

  if (user.statut === 'SUSPENDU') {
    return {
      autorise: false,
      motif: 'Compte suspendu temporairement — contacter le support TIKEXO',
    };
  }

  // Bénéficiaire rattaché à une entreprise KYB validée
  if (user.kyc_via_entreprise && user.kyc_niveau === 'ZERO') {
    return { autorise: true };
  }

  // Bénéficiaire avec solde résiduel (wallet autonome après départ)
  if (!user.kyc_via_entreprise && user.wallet) {
    const solde = parseFloat(user.wallet.solde.toString());
    if (solde > 0) {
      return { autorise: true };
    }
  }

  // Commerçant avec KYB validé
  if (user.kyc_niveau === 'KYB') {
    return { autorise: true };
  }

  if (user.statut === 'INACTIF') {
    return { autorise: false, motif: 'Compte non activé — vérifiez vos accès TIKEXO' };
  }

  return {
    autorise: false,
    motif: 'Accès non autorisé — contacter votre employeur ou le support TIKEXO',
  };
}

module.exports = {
  validerKYCViaBeneficiaire,
  cascadeKYCApresDepart,
  verifierAccesTransaction,
};
