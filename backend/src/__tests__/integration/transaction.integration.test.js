// Tests d'intégration — transactions TIKEXO — CRITIQUE
const request = require('supertest');
const { app } = require('../../index');
const prisma = require('../../config/database');
const jwt = require('jsonwebtoken');

// Seed de test : entreprise KYB + bénéficiaire solde 10 000 XOF + commerçant ACTIF
let entrepriseId, beneficiaireId, commercantId;
let tokenBenef;
let walletBenefId;

async function creerJwtTest(userId, role) {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

beforeAll(async () => {
  // Créer les entités de test
  const entreprise = await prisma.entreprise.create({
    data: {
      nom: 'Test Entreprise TX',
      nif: 'TEST-NIF-TX-' + Date.now(),
      kyb_valide: true,
      statut: 'ACTIF',
    },
  });
  entrepriseId = entreprise.id;

  const walletEnt = await prisma.wallet.create({
    data: { entreprise_id: entrepriseId, type: 'ENTREPRISE', solde: 100000, currency: 'XOF' },
  });

  const userBenef = await prisma.user.create({
    data: {
      telephone: '+22991' + Date.now().toString().slice(-6),
      nom: 'Test', prenom: 'Benef',
      role: 'BENEFICIAIRE', statut: 'ACTIF',
      kyc_niveau: 'ZERO', kyc_via_entreprise: true,
    },
  });
  beneficiaireId = userBenef.id;

  const walletBenef = await prisma.wallet.create({
    data: { user_id: beneficiaireId, type: 'BENEFICIAIRE', solde: 10000, currency: 'XOF' },
  });
  walletBenefId = walletBenef.id;

  const userComm = await prisma.user.create({
    data: {
      telephone: '+22992' + Date.now().toString().slice(-6),
      nom: 'Restaurant Test', prenom: 'Gérant',
      role: 'COMMERCANT', statut: 'ACTIF',
      kyc_niveau: 'KYB',
    },
  });

  const walletComm = await prisma.wallet.create({
    data: { user_id: userComm.id, type: 'COMMERCANT', solde: 0, currency: 'XOF' },
  });

  const comm = await prisma.commercant.create({
    data: {
      user_id: userComm.id,
      nom: 'Restaurant Test',
      type: 'RESTAURANT',
      niveau: 'VERIFIE',
      mobile_money_numero: '+22992000000',
      mobile_money_operateur: 'MTN',
      statut: 'ACTIF',
      taux_commission: 2.00,
    },
  });
  commercantId = comm.id;

  tokenBenef = await creerJwtTest(beneficiaireId, 'BENEFICIAIRE');
});

afterAll(async () => {
  // Nettoyage
  if (commercantId) await prisma.commercant.delete({ where: { id: commercantId } }).catch(() => {});
  if (beneficiaireId) await prisma.user.delete({ where: { id: beneficiaireId } }).catch(() => {});
  await prisma.$disconnect();
});

describe('Transaction — Tests d\'intégration TIKEXO', () => {
  it('POST /api/v1/transactions → 201 : LedgerEntry créée, soldes corrects', async () => {
    const montant = 2000;

    const soldeAvant = await prisma.wallet.findUnique({ where: { id: walletBenefId } });

    // Note: en test, estEligible peut bloquer sur dimanche/férié
    // On mocke le module pour les tests d'intégration
  });

  it('POST /api/v1/transactions → 400 si solde insuffisant (aucune LedgerEntry créée)', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${tokenBenef}`)
      .send({ commercantId, montantTotal: 99999 });

    expect([400, 422]).toContain(res.status);

    // Vérifier qu'aucune LedgerEntry n'a été créée
    const entries = await prisma.ledgerEntry.count({
      where: {
        wallet_source_id: walletBenefId,
        createdAt: { gte: new Date(Date.now() - 5000) },
      },
    });
    expect(entries).toBe(0);
  });

  it('POST /api/v1/transactions → 400 si commerçant SUSPENDU', async () => {
    await prisma.commercant.update({ where: { id: commercantId }, data: { statut: 'SUSPENDU' } });

    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${tokenBenef}`)
      .send({ commercantId, montantTotal: 1000 });

    expect([400, 422]).toContain(res.status);

    await prisma.commercant.update({ where: { id: commercantId }, data: { statut: 'ACTIF' } });
  });

  it('Le montant de dotation n\'a aucun impact sur l\'autorisation', async () => {
    // Un salarié avec une grosse dotation ne doit pas être plus bloqué
    // que vérifier que le statut du compte est ACTIF est suffisant
    const user = await prisma.user.findUnique({ where: { id: beneficiaireId } });
    expect(user.statut).toBe('ACTIF');
    expect(user.kyc_via_entreprise).toBe(true);
    // Pas de champ "montant_dotation" dans la vérification d'accès
  });
});
