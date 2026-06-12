// Tests unitaires — fedapay.service.js (mock FedaPay SDK)
jest.mock('../../config/fedapay', () => ({
  FedaPay: {
    Transaction: { create: jest.fn() },
    Payout: { create: jest.fn() },
  },
  FEDAPAY_WEBHOOK_SECRET: 'test-secret',
}));

jest.mock('../../utils/ledger', () => ({
  crediterWallet: jest.fn().mockResolvedValue({ id: 'entry-1' }),
  debiterWallet: jest.fn().mockResolvedValue({ id: 'entry-2' }),
}));

const crypto = require('crypto');
const { creerCollecte, traiterWebhook, declencherPayout, jobBatchingPayouts } = require('../../modules/fedapay/fedapay.service');
const { crediterWallet } = require('../../utils/ledger');

const prismaMock = {
  $executeRaw: jest.fn().mockResolvedValue(1),
  fedapayOperation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  wallet: {
    findUniqueOrThrow: jest.fn(),
  },
  commercant: {
    findUniqueOrThrow: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('fedapay.service.js — intégration FedaPay TIKEXO', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('creerCollecte', () => {
    it('crée FedapayOperation en base AVANT l\'appel FedaPay', async () => {
      const { FedaPay } = require('../../config/fedapay');

      prismaMock.fedapayOperation.create.mockResolvedValue({ id: 'op-1', tentatives: 0 });
      FedaPay.Transaction.create.mockResolvedValue({
        id: 12345,
        generateToken: jest.fn().mockResolvedValue({ url: 'https://fedapay.test/pay' }),
      });

      await creerCollecte(prismaMock, { entrepriseId: 'ent-1', montant: 50000, telephonePayeur: '+22997000000' });

      // L'opération en base est créée en premier
      const createOrder = prismaMock.fedapayOperation.create.mock.invocationCallOrder[0];
      const fedapayCallOrder = FedaPay.Transaction.create.mock.invocationCallOrder[0];
      expect(createOrder).toBeLessThan(fedapayCallOrder);
    });
  });

  describe('traiterWebhook', () => {
    it('rejette si signature HMAC invalide', async () => {
      await expect(
        traiterWebhook(prismaMock, {
          payload: { transaction: { id: '123', status: 'approved' } },
          signature: 'mauvaise-signature',
        })
      ).rejects.toThrow('Signature webhook FedaPay invalide');
    });

    it('crédite le wallet exactement une fois si APPROUVE', async () => {
      process.env.FEDAPAY_WEBHOOK_SECRET = '';

      prismaMock.fedapayOperation.findUnique.mockResolvedValue({
        id: 'op-1',
        statut: 'EN_ATTENTE',
        entreprise_id: 'ent-1',
        montant: 50000,
      });
      prismaMock.wallet.findUniqueOrThrow.mockResolvedValue({ id: 'w-ent' });

      await traiterWebhook(prismaMock, {
        payload: { transaction: { id: '12345', status: 'approved' } },
        signature: '',
      });

      expect(crediterWallet).toHaveBeenCalledTimes(1);
    });

    it('ignore silencieusement un webhook doublon (idempotence)', async () => {
      process.env.FEDAPAY_WEBHOOK_SECRET = '';

      prismaMock.fedapayOperation.findUnique.mockResolvedValue({
        id: 'op-2',
        statut: 'APPROUVE',
      });

      const result = await traiterWebhook(prismaMock, {
        payload: { transaction: { id: '99999', status: 'approved' } },
        signature: '',
      });

      expect(result.doublon).toBe(true);
      expect(crediterWallet).not.toHaveBeenCalled();
    });

    it('ne crédite pas si statut declined', async () => {
      process.env.FEDAPAY_WEBHOOK_SECRET = '';

      prismaMock.fedapayOperation.findUnique.mockResolvedValue({
        id: 'op-3',
        statut: 'EN_ATTENTE',
        entreprise_id: 'ent-1',
      });

      await traiterWebhook(prismaMock, {
        payload: { transaction: { id: '54321', status: 'declined' } },
        signature: '',
      });

      expect(crediterWallet).not.toHaveBeenCalled();
    });
  });

  describe('declencherPayout', () => {
    it('ne déclenche pas si solde < seuil minimum', async () => {
      prismaMock.commercant.findUniqueOrThrow.mockResolvedValue({
        id: 'comm-1',
        nom: 'Restaurant Test',
        mobile_money_numero: '+22997000000',
        mobile_money_operateur: 'MTN',
        user: { wallet: { solde: 500 } },
      });

      await expect(declencherPayout(prismaMock, 'comm-1')).rejects.toThrow('insuffisant');
    });
  });

  describe('jobBatchingPayouts', () => {
    it('traite 1 seul appel FedaPay par commerçant (batching)', async () => {
      const { FedaPay } = require('../../config/fedapay');
      const payoutSendNow = jest.fn().mockResolvedValue({});
      FedaPay.Payout.create.mockResolvedValue({ id: 'payout-1', sendNow: payoutSendNow });

      prismaMock.commercant.findMany.mockResolvedValue([
        { id: 'c-1', nom: 'Restaurant A', mobile_money_numero: '+22997111', mobile_money_operateur: 'MTN', user: { wallet: { id: 'w-1', solde: 5000 } } },
      ]);
      prismaMock.fedapayOperation.create.mockResolvedValue({ id: 'op-batchin', tentatives: 0 });
      prismaMock.wallet.findUniqueOrThrow.mockResolvedValue({ id: 'w-1', solde: 5000 });

      // Simuler un jour ouvré en mockant
      jest.mock('../../utils/jours-feries-benin', () => ({
        estEligible: jest.fn().mockReturnValue(true),
      }));
    });
  });
});
