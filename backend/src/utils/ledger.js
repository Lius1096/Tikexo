// Moteur wallet interne TIKEXO
// Règle absolue : toute modification de solde passe par ce fichier uniquement
// LedgerEntry est immuable — jamais de UPDATE ni DELETE

class SoldeInsuffisantError extends Error {
  constructor(walletId, soldeActuel, montantRequis) {
    super(`TIKEXO — Solde insuffisant : wallet ${walletId} — solde ${soldeActuel} XOF, requis ${montantRequis} XOF`);
    this.name = 'SoldeInsuffisantError';
    this.code = 'SOLDE_INSUFFISANT';
    this.walletId = walletId;
    this.soldeActuel = soldeActuel;
    this.montantRequis = montantRequis;
  }
}

class WalletInactifError extends Error {
  constructor(walletId, statut) {
    super(`TIKEXO — Wallet inactif : ${walletId} (statut: ${statut})`);
    this.name = 'WalletInactifError';
    this.code = 'WALLET_INACTIF';
  }
}

/**
 * Crée une écriture ledger atomique.
 * La LedgerEntry est toujours créée AVANT toute modification de solde.
 */
async function creerEcritureLedger(prisma, {
  walletSourceId,
  walletDestId,
  montant,
  type,
  referenceFedapay,
  transactionId,
  sourceEntrepriseId,
  metadata,
}) {
  if (!montant || montant <= 0) {
    throw new Error(`TIKEXO — Montant invalide : ${montant}`);
  }

  // Opérations atomiques — extraites pour pouvoir s'exécuter dans ou hors transaction
  const executer = async (client) => {
    // Étape 1 : créer la LedgerEntry AVANT toute modification de solde
    // transaction_id peut venir du paramètre dédié OU du champ metadata (compatibilité appels legacy)
    const resolvedTransactionId = transactionId || (metadata && metadata.transaction_id) || null;

    const entree = await client.ledgerEntry.create({
      data: {
        wallet_source_id: walletSourceId || null,
        wallet_destination_id: walletDestId || null,
        montant,
        type,
        reference_fedapay: referenceFedapay || null,
        transaction_id: resolvedTransactionId,
        source_entreprise_id: sourceEntrepriseId || null,
        metadata: metadata || null,
      },
    });

    // Étape 2 : débiter la source si définie
    if (walletSourceId) {
      const walletSource = await client.wallet.findUniqueOrThrow({
        where: { id: walletSourceId },
      });

      if (walletSource.statut !== 'ACTIF') {
        throw new WalletInactifError(walletSourceId, walletSource.statut);
      }

      const soldeSource = parseFloat(walletSource.solde.toString());
      const montantNum = parseFloat(montant.toString());

      if (soldeSource < montantNum) {
        throw new SoldeInsuffisantError(walletSourceId, soldeSource, montantNum);
      }

      await client.$executeRaw`
        UPDATE "Wallet"
        SET solde = solde - ${montantNum}::numeric, "updatedAt" = NOW()
        WHERE id = ${walletSourceId}
      `;
    }

    // Étape 3 : créditer la destination si définie
    if (walletDestId) {
      const walletDest = await client.wallet.findUniqueOrThrow({
        where: { id: walletDestId },
      });

      if (walletDest.statut !== 'ACTIF') {
        throw new WalletInactifError(walletDestId, walletDest.statut);
      }

      const montantNum = parseFloat(montant.toString());

      await client.$executeRaw`
        UPDATE "Wallet"
        SET solde = solde + ${montantNum}::numeric, "updatedAt" = NOW()
        WHERE id = ${walletDestId}
      `;
    }

    return entree;
  };

  // Dans Prisma v5, le client de transaction (tx) n'a pas $transaction.
  // Si on est déjà dans une transaction, exécuter directement.
  // Sinon, démarrer une transaction atomique.
  if (typeof prisma.$transaction === 'function') {
    return prisma.$transaction(executer);
  }
  return executer(prisma);
}

/**
 * Crédite un wallet depuis une source externe (ex: rechargement FedaPay).
 * walletSourceId = null signifie entrée externe.
 */
async function crediterWallet(prisma, walletId, montant, type, metadata = {}) {
  return creerEcritureLedger(prisma, {
    walletSourceId: null,
    walletDestId: walletId,
    montant,
    type,
    metadata,
  });
}

/**
 * Débite un wallet vers l'extérieur (ex: payout FedaPay).
 * walletDestId = null signifie sortie externe.
 */
async function debiterWallet(prisma, walletId, montant, type, metadata = {}) {
  return creerEcritureLedger(prisma, {
    walletSourceId: walletId,
    walletDestId: null,
    montant,
    type,
    metadata,
  });
}

/**
 * Transfère entre deux wallets internes — atomique, rollback complet si échec.
 */
async function transfererEntreWallets(prisma, sourceId, destId, montant, type, metadata = {}) {
  return creerEcritureLedger(prisma, {
    walletSourceId: sourceId,
    walletDestId: destId,
    montant,
    type,
    metadata,
  });
}

/**
 * Calcule le solde segmenté par entreprise source.
 * Utile pour le remboursement FIFO au départ d'un salarié.
 */
async function calculerSoldeSegmente(prisma, userId) {
  const wallet = await prisma.wallet.findUniqueOrThrow({
    where: { user_id: userId },
  });

  // Entrées (dotations) par entreprise
  const entrees = await prisma.ledgerEntry.groupBy({
    by: ['source_entreprise_id'],
    where: {
      wallet_destination_id: wallet.id,
      type: 'DOTATION',
      source_entreprise_id: { not: null },
    },
    _sum: { montant: true },
  });

  // Sorties (paiements) du wallet — on les attribue FIFO à la première entreprise
  const totalSorties = await prisma.ledgerEntry.aggregate({
    where: {
      wallet_source_id: wallet.id,
      type: { in: ['PAIEMENT', 'COMPLEMENT'] },
    },
    _sum: { montant: true },
  });

  const totalEntrees = entrees.reduce((acc, e) => acc + parseFloat(e._sum.montant || 0), 0);
  const totalDepenses = parseFloat(totalSorties._sum.montant || 0);
  const soldeTotal = parseFloat(wallet.solde.toString());

  // Résoudre les sources avec allocation FIFO
  let resteAAllouer = totalDepenses;
  const sources = [];

  for (const entree of entrees) {
    const montantEntree = parseFloat(entree._sum.montant || 0);
    const depenseAllouee = Math.min(resteAAllouer, montantEntree);
    const soldeSource = montantEntree - depenseAllouee;
    resteAAllouer -= depenseAllouee;

    if (entree.source_entreprise_id) {
      const entreprise = await prisma.entreprise.findUnique({
        where: { id: entree.source_entreprise_id },
        select: { id: true, nom: true },
      });

      sources.push({
        entreprise_id: entree.source_entreprise_id,
        entreprise_nom: entreprise?.nom || 'Inconnu',
        montant: Math.max(0, soldeSource),
      });
    }
  }

  return {
    solde_total: soldeTotal,
    sources: sources.filter((s) => s.montant > 0),
  };
}

/**
 * Vérifie si un wallet a suffisamment de solde.
 */
async function verifierSolde(prisma, walletId, montantRequis) {
  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } });
  return parseFloat(wallet.solde.toString()) >= parseFloat(montantRequis.toString());
}

/**
 * Vérifie le plafond journalier d'un bénéficiaire.
 * Retourne { autorise, cumul_jour, reste }.
 */
async function verifierPlafondJournalier(prisma, beneficiaireId, montantNouveau, plafond) {
  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);

  const finJour = new Date();
  finJour.setHours(23, 59, 59, 999);

  const cumul = await prisma.transaction.aggregate({
    where: {
      beneficiaire_id: beneficiaireId,
      statut: 'VALIDEE',
      createdAt: { gte: debutJour, lte: finJour },
    },
    _sum: { montant_total: true },
  });

  const cumulJour = parseFloat(cumul._sum.montant_total || 0);
  const montantNum = parseFloat(montantNouveau.toString());
  const plafondNum = parseFloat(plafond.toString());
  const autorise = cumulJour + montantNum <= plafondNum;

  return {
    autorise,
    cumul_jour: cumulJour,
    reste: Math.max(0, plafondNum - cumulJour),
  };
}

module.exports = {
  SoldeInsuffisantError,
  WalletInactifError,
  creerEcritureLedger,
  crediterWallet,
  debiterWallet,
  transfererEntreWallets,
  calculerSoldeSegmente,
  verifierSolde,
  verifierPlafondJournalier,
};
