// Tests d'intégration — wallet TIKEXO
const request = require('supertest');
const { app } = require('../../index');
const prisma = require('../../config/database');
const jwt = require('jsonwebtoken');

let walletEntrepriseId, walletEntId, adminId, tokenAdmin;

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: {
      telephone: '+22993' + Date.now().toString().slice(-6),
      nom: 'Admin', prenom: 'Wallet',
      role: 'ADMIN_RH', statut: 'ACTIF',
    },
  });
  adminId = admin.id;

  const ent = await prisma.entreprise.create({
    data: {
      nom: 'Entreprise Wallet Test',
      nif: 'NIF-WAL-' + Date.now(),
      kyb_valide: true, statut: 'ACTIF',
    },
  });

  const wallet = await prisma.wallet.create({
    data: { entreprise_id: ent.id, type: 'ENTREPRISE', solde: 0, currency: 'XOF' },
  });
  walletEntId = wallet.id;
  walletEntrepriseId = ent.id;

  tokenAdmin = jwt.sign({ userId: adminId, role: 'ADMIN_RH' }, process.env.JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
  if (walletEntId) await prisma.wallet.delete({ where: { id: walletEntId } }).catch(() => {});
  if (walletEntrepriseId) await prisma.entreprise.delete({ where: { id: walletEntrepriseId } }).catch(() => {});
  if (adminId) await prisma.user.delete({ where: { id: adminId } }).catch(() => {});
  await prisma.$disconnect();
});

describe('Wallet — Tests d\'intégration TIKEXO', () => {
  it('GET /api/v1/wallet/solde → solde correct', async () => {
    const res = await request(app)
      .get('/api/v1/wallet/solde')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('solde');
  });

  it('Webhook APPROUVE FedaPay → wallet crédité + LedgerEntry créée', async () => {
    const fedapayTxId = 'test-fedapay-' + Date.now();

    // Créer une FedapayOperation en attente
    const op = await prisma.fedapayOperation.create({
      data: {
        type: 'COLLECTE',
        fedapay_transaction_id: fedapayTxId,
        montant: 10000,
        statut: 'EN_ATTENTE',
        entreprise_id: walletEntrepriseId,
      },
    });

    const soldeAvant = parseFloat((await prisma.wallet.findUnique({ where: { id: walletEntId } })).solde);

    // Envoyer le webhook (sans secret configuré pour le test)
    process.env.FEDAPAY_WEBHOOK_SECRET = '';
    const res = await request(app)
      .post('/api/v1/fedapay/webhook')
      .send({ transaction: { id: fedapayTxId, status: 'approved' } });

    expect(res.status).toBe(200);

    const walletApres = await prisma.wallet.findUnique({ where: { id: walletEntId } });
    const soldeApres = parseFloat(walletApres.solde);
    expect(soldeApres).toBe(soldeAvant + 10000);

    // Vérifier la LedgerEntry
    const entry = await prisma.ledgerEntry.findFirst({
      where: { wallet_destination_id: walletEntId, type: 'RECHARGEMENT' },
      orderBy: { createdAt: 'desc' },
    });
    expect(entry).toBeTruthy();
    expect(parseFloat(entry.montant)).toBe(10000);

    // Nettoyage
    await prisma.fedapayOperation.delete({ where: { id: op.id } }).catch(() => {});
  });

  it('Webhook APPROUVE doublon → pas de double crédit (idempotence)', async () => {
    const fedapayTxId = 'test-doublon-' + Date.now();

    // Créer une opération déjà APPROUVÉE
    const op = await prisma.fedapayOperation.create({
      data: {
        type: 'COLLECTE',
        fedapay_transaction_id: fedapayTxId,
        montant: 5000,
        statut: 'APPROUVE',
        entreprise_id: walletEntrepriseId,
      },
    });

    const soldeAvant = parseFloat((await prisma.wallet.findUnique({ where: { id: walletEntId } })).solde);

    process.env.FEDAPAY_WEBHOOK_SECRET = '';
    const res = await request(app)
      .post('/api/v1/fedapay/webhook')
      .send({ transaction: { id: fedapayTxId, status: 'approved' } });

    expect(res.status).toBe(200);
    expect(res.body.data.doublon).toBe(true);

    const soldeApres = parseFloat((await prisma.wallet.findUnique({ where: { id: walletEntId } })).solde);
    expect(soldeApres).toBe(soldeAvant); // Pas de crédit supplémentaire

    await prisma.fedapayOperation.delete({ where: { id: op.id } }).catch(() => {});
  });

  it('Webhook ECHOUE → wallet non crédité + statut ECHOUE', async () => {
    const fedapayTxId = 'test-echec-' + Date.now();

    const op = await prisma.fedapayOperation.create({
      data: {
        type: 'COLLECTE',
        fedapay_transaction_id: fedapayTxId,
        montant: 3000,
        statut: 'EN_ATTENTE',
        entreprise_id: walletEntrepriseId,
      },
    });

    const soldeAvant = parseFloat((await prisma.wallet.findUnique({ where: { id: walletEntId } })).solde);

    process.env.FEDAPAY_WEBHOOK_SECRET = '';
    await request(app)
      .post('/api/v1/fedapay/webhook')
      .send({ transaction: { id: fedapayTxId, status: 'declined' } });

    const soldeApres = parseFloat((await prisma.wallet.findUnique({ where: { id: walletEntId } })).solde);
    expect(soldeApres).toBe(soldeAvant);

    const opApres = await prisma.fedapayOperation.findUnique({ where: { id: op.id } });
    expect(opApres.statut).toBe('ECHOUE');

    await prisma.fedapayOperation.delete({ where: { id: op.id } }).catch(() => {});
  });
});
