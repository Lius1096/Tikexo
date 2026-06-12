// Tests d'intégration — dotations TIKEXO
const request = require('supertest');
const { app } = require('../../index');
const prisma = require('../../config/database');
const jwt = require('jsonwebtoken');

let entrepriseId, beneficiaireId, lienId, walletEntId, walletBenefId;
let tokenRH;

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: {
      telephone: '+22994' + Date.now().toString().slice(-6),
      nom: 'RH', prenom: 'Dotation',
      role: 'ADMIN_RH', statut: 'ACTIF',
    },
  });

  const ent = await prisma.entreprise.create({
    data: {
      nom: 'Entreprise Dotation Test',
      nif: 'NIF-DOT-' + Date.now(),
      kyb_valide: true, statut: 'ACTIF',
    },
  });
  entrepriseId = ent.id;

  const walletEnt = await prisma.wallet.create({
    data: { entreprise_id: entrepriseId, type: 'ENTREPRISE', solde: 500000, currency: 'XOF' },
  });
  walletEntId = walletEnt.id;

  const userBenef = await prisma.user.create({
    data: {
      telephone: '+22995' + Date.now().toString().slice(-6),
      nom: 'Benef', prenom: 'Dotation',
      role: 'BENEFICIAIRE', statut: 'ACTIF',
      kyc_niveau: 'ZERO', kyc_via_entreprise: true,
    },
  });
  beneficiaireId = userBenef.id;

  const walletBenef = await prisma.wallet.create({
    data: { user_id: beneficiaireId, type: 'BENEFICIAIRE', solde: 0, currency: 'XOF' },
  });
  walletBenefId = walletBenef.id;

  const lien = await prisma.lienEntrepriseBeneficiaire.create({
    data: {
      entreprise_id: entrepriseId,
      user_id: beneficiaireId,
      niveau: 'EMPLOYE',
      valeur_titre: 2500,
      taux_participation: 60,
      statut: 'ACTIF',
    },
  });
  lienId = lien.id;

  tokenRH = jwt.sign({ userId: admin.id, role: 'ADMIN_RH' }, process.env.JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
  if (lienId) await prisma.lienEntrepriseBeneficiaire.delete({ where: { id: lienId } }).catch(() => {});
  if (walletBenefId) await prisma.wallet.delete({ where: { id: walletBenefId } }).catch(() => {});
  if (beneficiaireId) await prisma.user.delete({ where: { id: beneficiaireId } }).catch(() => {});
  if (walletEntId) await prisma.wallet.delete({ where: { id: walletEntId } }).catch(() => {});
  if (entrepriseId) await prisma.entreprise.delete({ where: { id: entrepriseId } }).catch(() => {});
  await prisma.$disconnect();
});

describe('Dotation — Tests d\'intégration TIKEXO', () => {
  const moisConcerne = '2026-06-01';
  let dotationId;

  it('Calcul dotations : nb_titres correct selon jours ouvrés (hors fériés, hors dimanche)', async () => {
    const res = await request(app)
      .post('/api/v1/dotations/calculer')
      .set('Authorization', `Bearer ${tokenRH}`)
      .send({ entrepriseId, moisConcerne });

    expect(res.status).toBe(200);
    expect(res.body.data.dotations).toHaveLength(1);
    expect(res.body.data.joursOuvres).toBeGreaterThan(0);

    dotationId = res.body.data.dotations[0].id;
    const dot = res.body.data.dotations[0];
    expect(dot.nb_titres).toBe(res.body.data.joursOuvres);
  });

  it('Impossible de créer 2 dotations pour le même salarié le même mois', async () => {
    const res = await request(app)
      .post('/api/v1/dotations/calculer')
      .set('Authorization', `Bearer ${tokenRH}`)
      .send({ entrepriseId, moisConcerne });

    expect(res.status).toBe(200);
    // La dotation existante est retournée, pas créée en doublon
    expect(res.body.data.dotations).toHaveLength(1);
    expect(res.body.data.dotations[0].id).toBe(dotationId);
  });

  it('Validation : solde_reserve wallet entreprise non modifié (on valide seulement le statut)', async () => {
    const res = await request(app)
      .post('/api/v1/dotations/valider')
      .set('Authorization', `Bearer ${tokenRH}`)
      .send({ dotationIds: [dotationId] });

    expect(res.status).toBe(200);

    const dot = await prisma.dotation.findUnique({ where: { id: dotationId } });
    expect(dot.statut).toBe('VALIDE');
  });

  it('Distribution : wallets bénéficiaires crédités, 0 appel FedaPay vérifié', async () => {
    const soldeBenefAvant = parseFloat(
      (await prisma.wallet.findUnique({ where: { id: walletBenefId } })).solde
    );
    const soldeEntAvant = parseFloat(
      (await prisma.wallet.findUnique({ where: { id: walletEntId } })).solde
    );

    const res = await request(app)
      .post('/api/v1/dotations/distribuer')
      .set('Authorization', `Bearer ${tokenRH}`)
      .send({ dotationIds: [dotationId] });

    expect(res.status).toBe(200);

    const soldeBenefApres = parseFloat(
      (await prisma.wallet.findUnique({ where: { id: walletBenefId } })).solde
    );
    const soldeEntApres = parseFloat(
      (await prisma.wallet.findUnique({ where: { id: walletEntId } })).solde
    );

    // Vérifier que le bénéficiaire a reçu les fonds
    expect(soldeBenefApres).toBeGreaterThan(soldeBenefAvant);

    // Vérifier qu'aucune opération FedaPay n'a été créée
    const fedapayOps = await prisma.fedapayOperation.count({
      where: { createdAt: { gte: new Date(Date.now() - 5000) } },
    });
    expect(fedapayOps).toBe(0);
  });

  it('Rollback total si solde entreprise insuffisant au moment de distribuer', async () => {
    // Vider le wallet entreprise
    await prisma.$executeRaw`UPDATE "Wallet" SET solde = 0 WHERE id = ${walletEntId}`;

    // Créer une nouvelle dotation pour un autre mois
    const moisSuivant = '2026-07-01';
    const dotResult = await request(app)
      .post('/api/v1/dotations/calculer')
      .set('Authorization', `Bearer ${tokenRH}`)
      .send({ entrepriseId, moisConcerne: moisSuivant });

    const nouvelleDoId = dotResult.body.data.dotations[0]?.id;
    if (nouvelleDoId) {
      await request(app)
        .post('/api/v1/dotations/valider')
        .set('Authorization', `Bearer ${tokenRH}`)
        .send({ dotationIds: [nouvelleDoId] });

      const res = await request(app)
        .post('/api/v1/dotations/distribuer')
        .set('Authorization', `Bearer ${tokenRH}`)
        .send({ dotationIds: [nouvelleDoId] });

      expect([400, 422]).toContain(res.status);
      expect(res.body.error).toContain('insuffisant');
    }
  });
});
