// Tests unitaires — otp.js
const { genererOtp, hasherOtp, creerOtp, verifierOtp, OTP_TTL_MINUTES } = require('../../utils/otp');
const bcrypt = require('bcryptjs');

const prismaMock = {
  $executeRaw: jest.fn().mockResolvedValue(1),
  otpCode: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
};

describe('otp.js — gestion OTP TIKEXO', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('genererOtp', () => {
    it('retourne exactement 6 chiffres numériques', () => {
      const code = genererOtp();
      expect(code).toMatch(/^\d{6}$/);
    });

    it('deux appels successifs retournent des codes différents', () => {
      const c1 = genererOtp();
      const c2 = genererOtp();
      // Probabilité de collision : 1/900000 — acceptable
      expect(c1).not.toBe(c2);
    });
  });

  describe('hasherOtp', () => {
    it('produit un hash différent à chaque appel (salt bcrypt)', async () => {
      const h1 = await hasherOtp('123456');
      const h2 = await hasherOtp('123456');
      expect(h1).not.toBe(h2);
    });

    it('le hash est vérifiable avec bcrypt', async () => {
      const code = '654321';
      const hash = await hasherOtp(code);
      expect(await bcrypt.compare(code, hash)).toBe(true);
    });
  });

  describe('verifierOtp', () => {
    it('retourne false si expiré (> 5 min)', async () => {
      const expiredDate = new Date(Date.now() - (OTP_TTL_MINUTES + 1) * 60 * 1000);
      prismaMock.otpCode.findFirst.mockResolvedValue(null);

      const result = await verifierOtp(prismaMock, '+22900000001', '123456');
      expect(result.valide).toBe(false);
    });

    it('retourne false si tentatives >= 3', async () => {
      prismaMock.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        code_hash: '$2b$12$test',
        expiration: new Date(Date.now() + 60000),
        tentatives: 3,
        utilise: false,
      });

      const result = await verifierOtp(prismaMock, '+22900000002', '111111');
      expect(result.valide).toBe(false);
      expect(result.motif).toContain('tentatives');
    });

    it('retourne false si code incorrect', async () => {
      const hash = await hasherOtp('999999');
      prismaMock.otpCode.findFirst.mockResolvedValue({
        id: 'otp-2',
        code_hash: hash,
        expiration: new Date(Date.now() + 60000),
        tentatives: 0,
        utilise: false,
      });

      const result = await verifierOtp(prismaMock, '+22900000003', '123456');
      expect(result.valide).toBe(false);
    });

    it('retourne true et marque utilise=true si code valide', async () => {
      const code = genererOtp();
      const hash = await hasherOtp(code);

      prismaMock.otpCode.findFirst.mockResolvedValue({
        id: 'otp-3',
        code_hash: hash,
        expiration: new Date(Date.now() + 60000),
        tentatives: 0,
        utilise: false,
      });

      const result = await verifierOtp(prismaMock, '+22900000004', code);
      expect(result.valide).toBe(true);
      expect(prismaMock.$executeRaw).toHaveBeenCalled();
    });
  });
});
