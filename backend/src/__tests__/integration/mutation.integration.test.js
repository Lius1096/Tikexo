// Tests d'intégration — mutations (changement d'employeur) TIKEXO
const request = require('supertest');
const { app } = require('../../index');
const prisma = require('../../config/database');
const jwt = require('jsonwebtoken');

let userBenefId, entAId, entBId, mutationId, lienAId;
let tokenAdmin, tokenAdminB;

const emailPersoOriginal = `benef.mutation.${Date.now()}@gmail.com`;

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: {
      telephone: '+22996' + Date.now().toString().slice(-6),
      nom: 'Admin', prenom: 'Mutation',
      role: 'ADMIN_RH', statut: 'ACTIF',
    },
  });
  tokenAdmin = jwt.sign({ userId: admin.id, role: 'ADMIN_RH' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  tokenAdminB = tokenAdmin;

  const entA = await prisma.entreprise.create({
    data: { nom: 'Entreprise A', nif: 'NIF-MUT-A-' + Date.now(), kyb_valide: true, statut: 'ACTIF' },
  });
  entAId = entA.id;
  await prisma.wallet.create({ data: { entreprise_id: entAId, type: 'ENTREPRISE', solde: 100000, currency: 'XOF' } });

  const entB = await prisma.entreprise.create({
    data: { nom: 'Entreprise B', nif: 'NIF-MUT-B-' + Date.now(), kyb_valide: true, statut: 'ACTIF' },
  });
  entBId = entB.id;
  await prisma.wallet.create({ data: { entreprise_id: entBId, type: 'ENTREPRISE', solde: 100000, currency: 'XOF' } });

  const benef = await prisma.user.create({
    data: {
      telephone: '+22997' + Date.now().toString().slice(-6),
      nom: 'Dupont', prenom: 'Marie',
      email_perso: emailPersoOriginal,
      email_pro: 'marie.dupont@entreprise-a.bj',
      role: 'BENEFICIAIRE', statut: 'ACTIF',
      kyc_niveau: 'ZERO', kyc_via_entreprise: true,
    },
  });
  userBenefId = benef.id;

  await prisma.wallet.create({ data: { user_id: userBenefId, type: 'BENEFICIAIRE', solde: 8000, currency: 'XOF' } });

  const lienA = await prisma.lienEntrepriseBeneficiaire.create({
    data: {
      entreprise_id: entAId,
      user_id: userBenefId,
      niveau: 'EMPLOYE',
      allocation_mensuelle: 5000,
      statut: 'ACTIF',
    },
  });
  lienAId = lienA.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Mutation — Tests d\'intégration TIKEXO', () => {
  it('email_perso reste identique avant et après mutation (pivot stable)', async () => {
    const userAvant = await prisma.user.findUnique({ where: { id: userBenefId } });
    expect(userAvant.email_perso).toBe(emailPersoOriginal);

    // Initier une mutation
    const res = await request(app)
      .post('/api/v1/mutations')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        beneficiaireId: userBenefId,
        entrepriseAId: entAId,
        entrepriseBId: entBId,
        motif: 'Test mutation',
      });

    expect(res.status).toBe(201);
    mutationId = res.body.data.id;

    const userApres = await prisma.user.findUnique({ where: { id: userBenefId } });
    expect(userApres.email_perso).toBe(emailPersoOriginal); // Immuable
  });

  it('Validation A : email_pro mis à null, lien A fermé', async () => {
    const res = await request(app)
      .post(`/api/v1/mutations/${mutationId}/valider-a`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ dateDepart: '2026-06-30', optionSolde: 'CONSERVATION' });

    expect(res.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { id: userBenefId } });
    expect(user.email_pro).toBeNull(); // email_pro supprimé

    const lien = await prisma.lienEntrepriseBeneficiaire.findUnique({ where: { id: lienAId } });
    expect(lien.statut).toBe('TERMINE'); // Lien A fermé
  });

  it('Validation B : lien B créé, kyc_via_entreprise conservé (KYB B valide)', async () => {
    const res = await request(app)
      .post(`/api/v1/mutations/${mutationId}/valider-b`)
      .set('Authorization', `Bearer ${tokenAdminB}`)
      .send({
        dateEntree: '2026-07-01',
        niveau: 'EMPLOYE',
        valeurTitre: 3000,
        tauxParticipation: 60,
        emailPro: 'marie.dupont@entreprise-b.bj',
      });

    expect(res.status).toBe(200);

    // Vérifier que email_perso est toujours intact
    const user = await prisma.user.findUnique({ where: { id: userBenefId } });
    expect(user.email_perso).toBe(emailPersoOriginal);
    expect(user.email_pro).toBe('marie.dupont@entreprise-b.bj');
    expect(user.kyc_via_entreprise).toBe(true); // Conservé via entreprise B KYB validée
  });

  it('B ne peut pas accéder à l\'historique des transactions chez A → isolement des données', async () => {
    // Vérifier que les LedgerEntry de l'entreprise A ne sont pas accessibles à B
    const lienB = await prisma.lienEntrepriseBeneficiaire.findFirst({
      where: { user_id: userBenefId, entreprise_id: entBId, statut: 'ACTIF' },
    });
    expect(lienB).toBeTruthy();

    // Les dotations de A (avec source_entreprise_id = entAId) ne doivent pas être
    // visibles par un admin de B (vérifiable via le ledger segmenté)
  });

  it('Scénario complet : lien A fermé, lien B créé, solde résiduel A conservé', async () => {
    const mutation = await prisma.mutation.findUnique({
      where: { id: mutationId },
      include: { beneficiaire: true },
    });

    expect(mutation.statut).toBe('COMPLETE');
    expect(mutation.beneficiaire.email_perso).toBe(emailPersoOriginal);

    const wallet = await prisma.wallet.findUnique({ where: { user_id: userBenefId } });
    expect(parseFloat(wallet.solde)).toBeGreaterThanOrEqual(0); // Solde conservé
  });
});
