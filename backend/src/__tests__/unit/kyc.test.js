// Tests unitaires — kyc.js — couverture 100% obligatoire
const { validerKYCViaBeneficiaire, cascadeKYCApresDepart, verifierAccesTransaction } = require('../../utils/kyc');

jest.mock('../../config/firebase', () => ({
  envoyerNotificationPush: jest.fn().mockResolvedValue(null),
}));

const prismaMock = {
  entreprise: { findUniqueOrThrow: jest.fn() },
  user: {
    update: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  lienEntrepriseBeneficiaire: { count: jest.fn() },
  notification: { create: jest.fn() },
  $executeRaw: jest.fn().mockResolvedValue(1),
};

describe('kyc.js — logique KYC TIKEXO', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('validerKYCViaBeneficiaire', () => {
    it('refuse si entreprise.kyb_valide = false', async () => {
      prismaMock.entreprise.findUniqueOrThrow.mockResolvedValue({ id: 'ent-1', kyb_valide: false });

      await expect(validerKYCViaBeneficiaire(prismaMock, 'user-1', 'ent-1'))
        .rejects.toThrow('n\'a pas de KYB validé');
    });

    it('accepte et met kyc_via_entreprise = true si KYB valide', async () => {
      prismaMock.entreprise.findUniqueOrThrow.mockResolvedValue({ id: 'ent-1', kyb_valide: true });
      prismaMock.user.update.mockResolvedValue({});

      const result = await validerKYCViaBeneficiaire(prismaMock, 'user-1', 'ent-1');

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({ kyc_via_entreprise: true, kyc_niveau: 'ZERO', statut: 'ACTIF' }),
      });
      expect(result.kyc_valide).toBe(true);
    });
  });

  describe('cascadeKYCApresDepart', () => {
    it('met kyc_via_entreprise = false si plus de lien actif', async () => {
      prismaMock.lienEntrepriseBeneficiaire.count.mockResolvedValue(0);
      prismaMock.$executeRaw.mockResolvedValue(1);
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', fcm_token: null });
      prismaMock.notification.create.mockResolvedValue({});

      const result = await cascadeKYCApresDepart(prismaMock, 'user-1');
      expect(result.liensActifsRestants).toBe(0);
    });

    it('kyc_via_entreprise reste true si autre lien actif', async () => {
      prismaMock.lienEntrepriseBeneficiaire.count.mockResolvedValue(1);

      const result = await cascadeKYCApresDepart(prismaMock, 'user-1');
      expect(result.liensActifsRestants).toBe(1);
      expect(prismaMock.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe('verifierAccesTransaction', () => {
    it('retourne false si compte BLOQUE', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u-1', statut: 'BLOQUE', kyc_niveau: 'ZERO', kyc_via_entreprise: true, wallet: null,
      });

      const result = await verifierAccesTransaction(prismaMock, 'u-1');
      expect(result.autorise).toBe(false);
    });

    it('retourne true si ZERO + solde résiduel > 0 (wallet autonome après départ)', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u-2', statut: 'ACTIF', kyc_niveau: 'ZERO', kyc_via_entreprise: false,
        wallet: { solde: 5000 },
      });

      const result = await verifierAccesTransaction(prismaMock, 'u-2');
      expect(result.autorise).toBe(true);
    });

    it('retourne true si kyc_via_entreprise = true', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u-3', statut: 'ACTIF', kyc_niveau: 'ZERO', kyc_via_entreprise: true, wallet: null,
      });

      const result = await verifierAccesTransaction(prismaMock, 'u-3');
      expect(result.autorise).toBe(true);
    });

    it('n\'est JAMAIS bloqué sur le montant de dotation — le wallet est passif', async () => {
      // Un salarié avec dotation de 500 000 XOF ne doit pas être plus bloqué qu'un à 5 000 XOF
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u-riche', statut: 'ACTIF', kyc_niveau: 'ZERO', kyc_via_entreprise: true,
        wallet: { solde: 500000 },
      });

      const result = await verifierAccesTransaction(prismaMock, 'u-riche');
      expect(result.autorise).toBe(true);
    });
  });
});
