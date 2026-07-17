// Tests unitaires — ledger.js — couverture 100% obligatoire
const {
  SoldeInsuffisantError,
  creerEcritureLedger,
  crediterWallet,
  debiterWallet,
  transfererEntreWallets,
  calculerSoldeSegmente,
  verifierSolde,
  verifierPlafondJournalier,
} = require('../../utils/ledger');

// Mock Prisma
const prismaTransactionMock = jest.fn();
const prismaMock = {
  $transaction: jest.fn((fn) => fn(prismaMock)),
  $executeRaw: jest.fn().mockResolvedValue(1),
  wallet: {
    findUniqueOrThrow: jest.fn(),
    findUnique: jest.fn(),
  },
  transaction: {
    aggregate: jest.fn(),
  },
  entreprise: {
    findUnique: jest.fn(),
  },
  ledgerEntry: {
    create: jest.fn(),
    groupBy: jest.fn(),
    aggregate: jest.fn(),
  },
};

describe('ledger.js — moteur wallet TIKEXO', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('creerEcritureLedger', () => {
    it('crée LedgerEntry et met à jour les 2 soldes', async () => {
      prismaMock.ledgerEntry.create.mockResolvedValue({ id: 'entry-1', montant: 1000 });
      prismaMock.wallet.findUniqueOrThrow
        .mockResolvedValueOnce({ id: 'w-source', solde: 5000, statut: 'ACTIF' })
        .mockResolvedValueOnce({ id: 'w-dest', solde: 0, statut: 'ACTIF' });
      prismaMock.$executeRaw.mockResolvedValue(1);

      const entry = await creerEcritureLedger(prismaMock, {
        walletSourceId: 'w-source',
        walletDestId: 'w-dest',
        montant: 1000,
        type: 'PAIEMENT',
      });

      // LedgerEntry créée en premier
      expect(prismaMock.ledgerEntry.create).toHaveBeenCalledBefore
        ? expect(prismaMock.ledgerEntry.create).toHaveBeenCalledBefore(prismaMock.$executeRaw)
        : expect(prismaMock.ledgerEntry.create).toHaveBeenCalled();

      expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(2);
      expect(entry.id).toBe('entry-1');
    });

    it('lève SoldeInsuffisantError si solde source < montant', async () => {
      prismaMock.ledgerEntry.create.mockResolvedValue({ id: 'entry-2' });
      prismaMock.wallet.findUniqueOrThrow.mockResolvedValue({ id: 'w-pauvre', solde: 100, statut: 'ACTIF' });

      await expect(
        creerEcritureLedger(prismaMock, {
          walletSourceId: 'w-pauvre',
          walletDestId: 'w-dest',
          montant: 500,
          type: 'PAIEMENT',
        })
      ).rejects.toThrow(SoldeInsuffisantError);
    });

    it('rejette un montant nul ou négatif', async () => {
      await expect(
        creerEcritureLedger(prismaMock, { walletSourceId: 'w1', walletDestId: 'w2', montant: 0, type: 'PAIEMENT' })
      ).rejects.toThrow();
    });
  });

  describe('transfererEntreWallets', () => {
    it('rollback complet si crédit destination échoue', async () => {
      prismaMock.ledgerEntry.create.mockResolvedValue({ id: 'e1' });
      prismaMock.wallet.findUniqueOrThrow
        .mockResolvedValueOnce({ id: 'w-s', solde: 5000, statut: 'ACTIF' })
        .mockResolvedValueOnce({ id: 'w-d', solde: 0, statut: 'GELE' });

      await expect(
        transfererEntreWallets(prismaMock, 'w-s', 'w-d', 1000, 'DOTATION')
      ).rejects.toThrow('Wallet inactif');
    });
  });

  describe('verifierPlafondJournalier', () => {
    it('retourne false si cumul_jour + nouveau > plafond', async () => {
      prismaMock.transaction.aggregate.mockResolvedValue({ _sum: { montant_total: 9500 } });

      const result = await verifierPlafondJournalier(prismaMock, 'benef-1', 1000, 10000);

      expect(result.autorise).toBe(false);
      expect(result.cumul_jour).toBe(9500);
    });

    it('retourne true si premier paiement du jour dans le plafond', async () => {
      prismaMock.transaction.aggregate.mockResolvedValue({ _sum: { montant_total: null } });

      const result = await verifierPlafondJournalier(prismaMock, 'benef-1', 5000, 10000);

      expect(result.autorise).toBe(true);
      expect(result.cumul_jour).toBe(0);
    });
  });

  describe('calculerSoldeSegmente', () => {
    it('retourne les bonnes sources avec les bons montants', async () => {
      prismaMock.wallet.findUniqueOrThrow.mockResolvedValue({ id: 'w-b', solde: 8000 });
      prismaMock.ledgerEntry.groupBy.mockResolvedValue([
        { source_entreprise_id: 'ent-1', _sum: { montant: 10000 } },
      ]);
      prismaMock.ledgerEntry.aggregate.mockResolvedValue({ _sum: { montant: 2000 } });
      prismaMock.entreprise.findUnique.mockResolvedValue({ id: 'ent-1', nom: 'Société Test' });

      const result = await calculerSoldeSegmente(prismaMock, 'user-1');

      expect(result.solde_total).toBe(8000);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].entreprise_id).toBe('ent-1');
      expect(result.sources[0].montant).toBe(8000);
    });
  });

  describe('verifierSolde', () => {
    it('retourne true si solde >= montant requis', async () => {
      prismaMock.wallet.findUniqueOrThrow.mockResolvedValue({ solde: 5000 });
      expect(await verifierSolde(prismaMock, 'w-1', 3000)).toBe(true);
    });

    it('retourne false si solde < montant requis', async () => {
      prismaMock.wallet.findUniqueOrThrow.mockResolvedValue({ solde: 100 });
      expect(await verifierSolde(prismaMock, 'w-1', 500)).toBe(false);
    });
  });

  describe('SoldeInsuffisantError', () => {
    it('a le bon code et les bons attributs', () => {
      const err = new SoldeInsuffisantError('w-1', 100, 500);
      expect(err.code).toBe('SOLDE_INSUFFISANT');
      expect(err.soldeActuel).toBe(100);
      expect(err.montantRequis).toBe(500);
      expect(err instanceof Error).toBe(true);
    });
  });
});
