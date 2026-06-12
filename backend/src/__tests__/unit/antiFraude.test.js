// Tests unitaires — antiFraude.js — couverture 100% obligatoire
const {
  evaluerTransaction,
  regleVelocite,
  regleMontantAnormal,
  regleMultiComptes,
  NIVEAUX,
} = require('../../utils/antiFraude');

const prismaMock = {
  transaction: {
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  auditLog: {
    count: jest.fn(),
  },
  user: {
    count: jest.fn(),
  },
  commercant: {
    findMany: jest.fn(),
  },
};

describe('antiFraude.js — moteur anti-fraude TIKEXO', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Règle 1 — Vélocité', () => {
    it('retourne NIVEAU 3 si > 3 transactions même commerçant en < 10 min', async () => {
      prismaMock.transaction.count.mockResolvedValue(4);
      const r = await regleVelocite(prismaMock, 'benef-1', 'comm-1');
      expect(r.niveau).toBe(3);
      expect(r.regle).toBe(1);
    });

    it('retourne null si 3 transactions ou moins (pas d\'alerte)', async () => {
      prismaMock.transaction.count.mockResolvedValue(3);
      const r = await regleVelocite(prismaMock, 'benef-1', 'comm-1');
      expect(r).toBeNull();
    });

    it('retourne null si 0 transaction (pas d\'historique)', async () => {
      prismaMock.transaction.count.mockResolvedValue(0);
      const r = await regleVelocite(prismaMock, 'benef-1', 'comm-1');
      expect(r).toBeNull();
    });
  });

  describe('Règle 2 — Montant anormal', () => {
    it('retourne NIVEAU 2 si montant = 4× la moyenne 30 jours', async () => {
      prismaMock.transaction.aggregate.mockResolvedValue({
        _avg: { montant_total: 2000 },
        _count: 5,
      });
      const r = await regleMontantAnormal(prismaMock, 'benef-1', 8500);
      expect(r.niveau).toBe(2);
      expect(r.regle).toBe(2);
    });

    it('retourne null si premier paiement (pas d\'historique)', async () => {
      prismaMock.transaction.aggregate.mockResolvedValue({
        _avg: { montant_total: 0 },
        _count: 0,
      });
      const r = await regleMontantAnormal(prismaMock, 'benef-1', 5000);
      expect(r).toBeNull();
    });

    it('retourne null si montant dans la norme', async () => {
      prismaMock.transaction.aggregate.mockResolvedValue({
        _avg: { montant_total: 2000 },
        _count: 10,
      });
      const r = await regleMontantAnormal(prismaMock, 'benef-1', 2500);
      expect(r).toBeNull();
    });
  });

  describe('Règle 5 — Multi-comptes', () => {
    it('retourne NIVEAU 4 si même téléphone sur plusieurs comptes', async () => {
      prismaMock.user.count.mockResolvedValue(2);
      const r = await regleMultiComptes(prismaMock, '+22997000000');
      expect(r.niveau).toBe(4);
      expect(r.regle).toBe(5);
    });

    it('retourne null si téléphone unique', async () => {
      prismaMock.user.count.mockResolvedValue(1);
      const r = await regleMultiComptes(prismaMock, '+22997000001');
      expect(r).toBeNull();
    });
  });

  describe('evaluerTransaction', () => {
    it('retourne le niveau le plus élevé si plusieurs règles déclenchées', async () => {
      prismaMock.transaction.count.mockResolvedValue(5);
      prismaMock.transaction.aggregate
        .mockResolvedValueOnce({ _avg: { montant_total: 1000 }, _count: 5 })
        .mockResolvedValueOnce({ _avg: { montant_total: 0 }, _count: 0 });
      prismaMock.user.count.mockResolvedValue(1);
      prismaMock.auditLog = { count: jest.fn().mockResolvedValue(0) };

      const result = await evaluerTransaction(prismaMock, {
        beneficiaireId: 'b-1',
        commercantId: 'c-1',
        montant: 50000,
      });

      expect(result.niveau).toBeGreaterThanOrEqual(2);
      expect(NIVEAUX[result.niveau]).toBeDefined();
      expect(result.regles_declenchees.length).toBeGreaterThan(0);
    });

    it('retourne niveau 0 si aucune règle déclenchée', async () => {
      prismaMock.transaction.count.mockResolvedValue(1);
      prismaMock.transaction.aggregate.mockResolvedValue({ _avg: { montant_total: 1000 }, _count: 2 });
      prismaMock.user.count.mockResolvedValue(1);

      const result = await evaluerTransaction(prismaMock, {
        beneficiaireId: 'b-2',
        commercantId: 'c-2',
        montant: 1000,
      });

      expect(result.niveau).toBe(0);
      expect(result.regles_declenchees).toHaveLength(0);
      expect(result.action_requise).toBeNull();
    });
  });
});
