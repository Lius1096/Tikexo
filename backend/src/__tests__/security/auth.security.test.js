// Tests de sécurité — authentification TIKEXO
const request = require('supertest');
const { app } = require('../../index');
const prisma = require('../../config/database');
const jwt = require('jsonwebtoken');

let tokenBenef, tokenAdminRHA, tokenAdminRHB, entAId, entBId;

beforeAll(async () => {
  const entA = await prisma.entreprise.create({
    data: { nom: 'Sécurité A', nif: 'NIF-SEC-A-' + Date.now(), kyb_valide: true, statut: 'ACTIF' },
  });
  entAId = entA.id;

  const entB = await prisma.entreprise.create({
    data: { nom: 'Sécurité B', nif: 'NIF-SEC-B-' + Date.now(), kyb_valide: true, statut: 'ACTIF' },
  });
  entBId = entB.id;

  const adminA = await prisma.user.create({
    data: {
      telephone: '+22901' + Date.now().toString().slice(-6),
      nom: 'Admin', prenom: 'A',
      role: 'ADMIN_RH', statut: 'ACTIF',
    },
  });
  await prisma.entrepriseAdmin.create({ data: { entreprise_id: entAId, user_id: adminA.id, role: 'ADMIN_RH' } });
  tokenAdminRHA = jwt.sign({ userId: adminA.id, role: 'ADMIN_RH', entrepriseId: entAId }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const adminB = await prisma.user.create({
    data: {
      telephone: '+22902' + Date.now().toString().slice(-6),
      nom: 'Admin', prenom: 'B',
      role: 'ADMIN_RH', statut: 'ACTIF',
    },
  });
  await prisma.entrepriseAdmin.create({ data: { entreprise_id: entBId, user_id: adminB.id, role: 'ADMIN_RH' } });
  tokenAdminRHB = jwt.sign({ userId: adminB.id, role: 'ADMIN_RH', entrepriseId: entBId }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const benef = await prisma.user.create({
    data: {
      telephone: '+22903' + Date.now().toString().slice(-6),
      nom: 'Benef', prenom: 'Sec',
      role: 'BENEFICIAIRE', statut: 'ACTIF',
    },
  });
  tokenBenef = jwt.sign({ userId: benef.id, role: 'BENEFICIAIRE' }, process.env.JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Sécurité — Authentification et autorisations TIKEXO', () => {
  describe('Routes admin sans token', () => {
    it('GET /api/v1/admin/entreprises → 401 sans token', async () => {
      const res = await request(app).get('/api/v1/admin/entreprises');
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/admin/users → 401 sans token', async () => {
      const res = await request(app).get('/api/v1/admin/users');
      expect(res.status).toBe(401);
    });

    it('POST /api/v1/dotations/calculer → 401 sans token', async () => {
      const res = await request(app)
        .post('/api/v1/dotations/calculer')
        .send({ entrepriseId: entAId, moisConcerne: '2026-06-01' });
      expect(res.status).toBe(401);
    });
  });

  describe('Routes admin avec token BENEFICIAIRE', () => {
    it('GET /api/v1/admin/entreprises → 403 avec token BENEFICIAIRE', async () => {
      const res = await request(app)
        .get('/api/v1/admin/entreprises')
        .set('Authorization', `Bearer ${tokenBenef}`);
      expect(res.status).toBe(403);
    });

    it('POST /api/v1/dotations/calculer → 403 avec token BENEFICIAIRE', async () => {
      const res = await request(app)
        .post('/api/v1/dotations/calculer')
        .set('Authorization', `Bearer ${tokenBenef}`)
        .send({ entrepriseId: entAId, moisConcerne: '2026-06-01' });
      expect(res.status).toBe(403);
    });
  });

  describe('Injection SQL', () => {
    it('Injection SQL dans telephone → rejetée proprement (pas de 500)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/otp/demander')
        .send({ telephone: "'; DROP TABLE \"User\"; --" });

      expect(res.status).not.toBe(500);
      expect([400, 422]).toContain(res.status);
    });

    it('Injection SQL dans body → rejetée proprement', async () => {
      const res = await request(app)
        .post('/api/v1/auth/otp/verifier')
        .send({
          telephone: '+22901000000',
          code: "' OR '1'='1",
        });

      expect(res.status).not.toBe(500);
      expect([400, 401, 422]).toContain(res.status);
    });
  });

  describe('JWT invalide', () => {
    it('JWT expiré → 401', async () => {
      const expiredToken = jwt.sign(
        { userId: 'some-id', role: 'ADMIN_RH' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/v1/wallet/solde')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    it('JWT falsifié (mauvais secret) → 401', async () => {
      const tamperedToken = jwt.sign(
        { userId: 'some-id', role: 'SUPER_ADMIN' },
        'mauvais-secret-tikexo',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/v1/admin/entreprises')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
    });

    it('Pas de Bearer prefix → 401', async () => {
      const res = await request(app)
        .get('/api/v1/wallet/solde')
        .set('Authorization', tokenBenef); // Sans "Bearer "

      expect(res.status).toBe(401);
    });
  });

  describe('Isolation des entreprises (ADMIN_RH A ne peut pas voir B)', () => {
    it('Admin RH de A ne peut pas lister les bénéficiaires de B → 403', async () => {
      const res = await request(app)
        .get(`/api/v1/entreprises/${entBId}/beneficiaires`)
        .set('Authorization', `Bearer ${tokenAdminRHA}`);

      // L'accès doit être bloqué — soit 403 (interdit) soit 404 (obfuscation)
      expect([403, 404]).toContain(res.status);
    });

    it('Admin RH de A ne peut pas créer une dotation pour B → 403', async () => {
      const res = await request(app)
        .post('/api/v1/dotations/calculer')
        .set('Authorization', `Bearer ${tokenAdminRHA}`)
        .send({ entrepriseId: entBId, moisConcerne: '2026-06-01' });

      expect([403, 404]).toContain(res.status);
    });
  });
});
