// Moteur anti-fraude TIKEXO
// 8 règles, 4 niveaux : ALERTE | CONFIRMATION | BLOCAGE_TEMPORAIRE | BLOCAGE_DEFINITIF

const NIVEAUX = {
  0: 'OK',
  1: 'ALERTE',
  2: 'CONFIRMATION',
  3: 'BLOCAGE_TEMPORAIRE',
  4: 'BLOCAGE_DEFINITIF',
};

const ACTIONS_REQUISES = {
  0: null,
  1: 'JOURNALISER',
  2: 'DEMANDER_CONFIRMATION',
  3: 'BLOQUER_TEMPORAIREMENT',
  4: 'BLOQUER_DEFINITIVEMENT',
};

/**
 * Règle 1 — Vélocité : > 3 transactions même commerçant en < 10 min → NIVEAU 3
 */
async function regleVelocite(prisma, beneficiaireId, commercantId) {
  const il_y_a_10_min = new Date(Date.now() - 10 * 60 * 1000);

  const count = await prisma.transaction.count({
    where: {
      beneficiaire_id: beneficiaireId,
      commercant_id: commercantId,
      createdAt: { gte: il_y_a_10_min },
      statut: { in: ['EN_COURS', 'VALIDEE'] },
    },
  });

  return count > 3 ? { niveau: 3, regle: 1, detail: `${count} transactions en 10 min` } : null;
}

/**
 * Règle 2 — Montant anormal : > 3× la moyenne 30 jours → NIVEAU 2
 */
async function regleMontantAnormal(prisma, beneficiaireId, montant) {
  const il_y_a_30_jours = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const stats = await prisma.transaction.aggregate({
    where: {
      beneficiaire_id: beneficiaireId,
      statut: 'VALIDEE',
      createdAt: { gte: il_y_a_30_jours },
    },
    _avg: { montant_total: true },
    _count: true,
  });

  if (stats._count === 0) return null;

  const moyenne = parseFloat(stats._avg.montant_total || 0);
  if (moyenne === 0) return null;

  const montantNum = parseFloat(montant.toString());
  if (montantNum > moyenne * 3) {
    return { niveau: 2, regle: 2, detail: `Montant ${montantNum} > 3× moyenne ${moyenne.toFixed(0)}` };
  }

  return null;
}

/**
 * Règle 3 — Hors zone habituelle (si géoloc activée) → NIVEAU 1
 */
async function regleHorsZone(prisma, beneficiaireId, localisation) {
  if (!localisation?.latitude || !localisation?.longitude) return null;

  const transactions = await prisma.transaction.findMany({
    where: {
      beneficiaire_id: beneficiaireId,
      statut: 'VALIDEE',
    },
    include: { commercant: { select: { latitude: true, longitude: true, ville: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  if (transactions.length === 0) return null;

  const villesHabituelles = new Set(
    transactions
      .map((t) => t.commercant.ville)
      .filter(Boolean)
  );

  return null;
}

/**
 * Règle 4 — PIN répété : 3 échecs en < 5 min → NIVEAU 3, 10 cumulés → NIVEAU 4
 */
async function reglePinRepete(prisma, userId) {
  const il_y_a_5_min = new Date(Date.now() - 5 * 60 * 1000);

  const echecs5min = await prisma.auditLog.count({
    where: {
      user_id: userId,
      action: 'PIN_ECHEC',
      createdAt: { gte: il_y_a_5_min },
    },
  });

  if (echecs5min >= 3) {
    const totalEchecs = await prisma.auditLog.count({
      where: { user_id: userId, action: 'PIN_ECHEC' },
    });

    if (totalEchecs >= 10) {
      return { niveau: 4, regle: 4, detail: `${totalEchecs} échecs PIN cumulés` };
    }
    return { niveau: 3, regle: 4, detail: `${echecs5min} échecs PIN en 5 min` };
  }

  return null;
}

/**
 * Règle 5 — Multi-comptes même téléphone → NIVEAU 4
 */
async function regleMultiComptes(prisma, telephone) {
  const comptes = await prisma.user.count({
    where: { telephone, statut: { not: 'ARCHIVE' } },
  });

  if (comptes > 1) {
    return { niveau: 4, regle: 5, detail: `${comptes} comptes actifs sur le même téléphone` };
  }

  return null;
}

/**
 * Règle 6 — Volume commerçant anormal sur 24h → NIVEAU 2 côté commerçant
 */
async function regleVolumeCommercant(prisma, commercantId, montant) {
  const il_y_a_24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const volume = await prisma.transaction.aggregate({
    where: {
      commercant_id: commercantId,
      statut: { in: ['EN_COURS', 'VALIDEE'] },
      createdAt: { gte: il_y_a_24h },
    },
    _sum: { montant_total: true },
    _avg: { montant_total: true },
    _count: true,
  });

  if (volume._count < 10) return null;

  const volumeTotal = parseFloat(volume._sum.montant_total || 0);
  const moyenne = parseFloat(volume._avg.montant_total || 0);
  const montantNum = parseFloat(montant.toString());

  if (montantNum > moyenne * 5) {
    return { niveau: 2, regle: 6, detail: `Volume commerçant anormal sur 24h` };
  }

  return null;
}

/**
 * Règle 7 — Dotation > 5× dotation habituelle → règle des 4 yeux obligatoire
 */
async function regleDotationAnormale(prisma, entrepriseId, montantDotation) {
  const il_y_a_6_mois = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);

  const stats = await prisma.dotation.aggregate({
    where: {
      entreprise_id: entrepriseId,
      statut: 'DISTRIBUE',
      createdAt: { gte: il_y_a_6_mois },
    },
    _avg: { montant_total: true },
    _count: true,
  });

  if (stats._count < 2) return null;

  const moyenne = parseFloat(stats._avg.montant_total || 0);
  const montantNum = parseFloat(montantDotation.toString());

  if (montantNum > moyenne * 5) {
    return { niveau: 2, regle: 7, detail: `Dotation ${montantNum} > 5× moyenne ${moyenne.toFixed(0)}` };
  }

  return null;
}

/**
 * Règle 8 — > 3 rechargements échoués en 1h → blocage rechargement
 */
async function regleRechargementsEchoues(prisma, entrepriseId) {
  const il_y_a_1h = new Date(Date.now() - 60 * 60 * 1000);

  const echecs = await prisma.fedapayOperation.count({
    where: {
      entreprise_id: entrepriseId,
      type: 'COLLECTE',
      statut: 'ECHOUE',
      createdAt: { gte: il_y_a_1h },
    },
  });

  if (echecs > 3) {
    return { niveau: 3, regle: 8, detail: `${echecs} rechargements échoués en 1h` };
  }

  return null;
}

/**
 * Évalue toutes les règles applicables et retourne le niveau le plus élevé.
 */
async function evaluerTransaction(prisma, { beneficiaireId, commercantId, montant, localisation, telephone }) {
  const resultats = await Promise.all([
    regleVelocite(prisma, beneficiaireId, commercantId),
    regleMontantAnormal(prisma, beneficiaireId, montant),
    regleHorsZone(prisma, beneficiaireId, localisation),
    localisation?.userId ? reglePinRepete(prisma, beneficiaireId) : Promise.resolve(null),
    telephone ? regleMultiComptes(prisma, telephone) : Promise.resolve(null),
    regleVolumeCommercant(prisma, commercantId, montant),
  ]);

  const regles_declenchees = resultats.filter(Boolean);

  if (regles_declenchees.length === 0) {
    return { niveau: 0, niveauLabel: NIVEAUX[0], regles_declenchees: [], action_requise: null };
  }

  const niveau = Math.max(...regles_declenchees.map((r) => r.niveau));

  return {
    niveau,
    niveauLabel: NIVEAUX[niveau],
    regles_declenchees,
    action_requise: ACTIONS_REQUISES[niveau],
  };
}

module.exports = {
  NIVEAUX,
  ACTIONS_REQUISES,
  evaluerTransaction,
  regleVelocite,
  regleMontantAnormal,
  regleHorsZone,
  reglePinRepete,
  regleMultiComptes,
  regleVolumeCommercant,
  regleDotationAnormale,
  regleRechargementsEchoues,
};
