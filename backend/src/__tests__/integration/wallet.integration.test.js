// Tests d'intégration — wallet TIKEXO
const request = require('supertest');
const { app } = require('../../index');
const prisma = require('../../config/database');
const jwt = require('jsonwebtoken');
const { traiterWebhook } = require('../../modules/fedapay/fedapay.service');

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

  // Lien EntrepriseAdmin requis : req.user.entrepriseId est dérivé de cette relation
  // par le middleware d'authentification, pas du payload JWT.
  await prisma.entrepriseAdmin.create({
    data: { entreprise_id: ent.id, user_id: adminId, role: 'ADMIN_RH' },
  });

  tokenAdmin = jwt.sign({ userId: adminId, role: 'ADMIN_RH' }, process.env.JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
  if (adminId) await prisma.entrepriseAdmin.deleteMany({ where: { user_id: adminId } }).catch(() => {});
  if (walletEntId) await prisma.wallet.delete({ where: { id: walletEntId } }).catch(() => {});
  if (walletEntrepriseId) await prisma.entreprise.delete({ where: { id: walletEntrepriseId } }).catch(() => {});
  if (adminId) await prisma.user.delete({ where: { id: adminId } }).catch(() => {});
  await prisma.$disconnect();
});

describe('Wallet — Tests d\'intégration TIKEXO', () => {
  it('GET /api/v1/entreprises/:id/wallet → solde correct', async () => {
    // /wallet/solde est réservé au wallet personnel (user_id) d'un bénéficiaire —
    // le wallet d'entreprise se consulte via /entreprises/:id/wallet.
    const res = await request(app)
      .get(`/api/v1/entreprises/${walletEntrepriseId}/wallet`)
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

    // La route HTTP ne fait qu'empiler le job en queue (traité par un worker en prod) —
    // on appelle directement le service pour tester le traitement, comme le fait le worker.
    process.env.FEDAPAY_WEBHOOK_SECRET = '';
    const payload = { transaction: { id: fedapayTxId, status: 'approved' } };
    await traiterWebhook(prisma, { payload, rawBody: JSON.stringify(payload), signature: '' });

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
    const payload = { transaction: { id: fedapayTxId, status: 'approved' } };
    const result = await traiterWebhook(prisma, { payload, rawBody: JSON.stringify(payload), signature: '' });

    expect(result.doublon).toBe(true);

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
    const payload = { transaction: { id: fedapayTxId, status: 'declined' } };
    await traiterWebhook(prisma, { payload, rawBody: JSON.stringify(payload), signature: '' });

    const soldeApres = parseFloat((await prisma.wallet.findUnique({ where: { id: walletEntId } })).solde);
    expect(soldeApres).toBe(soldeAvant);

    const opApres = await prisma.fedapayOperation.findUnique({ where: { id: op.id } });
    expect(opApres.statut).toBe('ECHOUE');

    await prisma.fedapayOperation.delete({ where: { id: op.id } }).catch(() => {});
  });
});
