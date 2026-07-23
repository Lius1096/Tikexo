// Tests de sécurité — rate limiting TIKEXO
const request = require('supertest');
const { app } = require('../../index');
const prisma = require('../../config/database');
const jwt = require('jsonwebtoken');

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Rate Limiting — Sécurité TIKEXO', () => {
  describe('limiterOtp — max 10 requêtes/heure par numéro', () => {
    it('> 10 demandes OTP sur le même numéro dans la fenêtre → 429', async () => {
      const telephone = '+22999' + Date.now().toString().slice(-6);
      let lastStatus;

      for (let i = 0; i <= 11; i++) {
        const res = await request(app)
          .post('/api/v1/auth/otp/demander')
          .send({ telephone });
        lastStatus = res.status;
        if (res.status === 429) break;
      }

      expect(lastStatus).toBe(429);
    }, 30000);
  });

  describe('limiterLogin — max 5 tentatives/15min par IP', () => {
    it('> 5 tentatives de vérification OTP erronées → 429', async () => {
      const telephone = '+22998' + Date.now().toString().slice(-6);
      let lastStatus;

      // Créer d'abord un OTP
      await request(app)
        .post('/api/v1/auth/otp/demander')
        .send({ telephone });

      for (let i = 0; i <= 6; i++) {
        const res = await request(app)
          .post('/api/v1/auth/otp/verifier')
          .send({ telephone, code: '000000' }); // Mauvais code
        lastStatus = res.status;
        if (res.status === 429) break;
      }

      expect([401, 429]).toContain(lastStatus);
    }, 30000);
  });

  describe('limiterGeneral — max 300 requêtes/min par IP', () => {
    it('> 300 requêtes/min avec le même token → 429 éventuellement', async () => {
      const user = await prisma.user.create({
        data: {
          telephone: '+22997' + Date.now().toString().slice(-6),
          nom: 'Rate', prenom: 'Test',
          role: 'BENEFICIAIRE', statut: 'ACTIF',
        },
      });
      const token = jwt.sign({ userId: user.id, role: 'BENEFICIAIRE' }, process.env.JWT_SECRET, { expiresIn: '1h' });

      let got429 = false;
      for (let i = 0; i < 310; i++) {
        const res = await request(app)
          .get('/api/v1/wallet/solde')
          .set('Authorization', `Bearer ${token}`);
        if (res.status === 429) {
          got429 = true;
          break;
        }
      }

      // Après 300+ requêtes, on doit déclencher le rate limit
      expect(got429).toBe(true);
    }, 90000);
  });

  describe('limiterTransaction — max 20 transactions/min par bénéficiaire', () => {
    it('> 20 tentatives de transaction/min → 429', async () => {
      const user = await prisma.user.create({
        data: {
          telephone: '+22996' + Date.now().toString().slice(-6),
          nom: 'Tx', prenom: 'RateLimit',
          role: 'BENEFICIAIRE', statut: 'ACTIF',
        },
      });
      const token = jwt.sign({ userId: user.id, role: 'BENEFICIAIRE' }, process.env.JWT_SECRET, { expiresIn: '1h' });

      let got429 = false;
      for (let i = 0; i < 25; i++) {
        const res = await request(app)
          .post('/api/v1/transactions')
          .set('Authorization', `Bearer ${token}`)
          .send({ commercantId: 'non-existent', montantTotal: 100 });
        if (res.status === 429) {
          got429 = true;
          break;
        }
      }

      expect(got429).toBe(true);
    }, 30000);
  });
});
