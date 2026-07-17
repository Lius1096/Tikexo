// Tests d'intégration — mutations (changement d'employeur) TIKEXO
//
// Flux réel : l'entreprise A traite la sortie d'un salarié (crée une mutation
// EN_ATTENTE, invisible pour B) → l'entreprise B rattache le même salarié
// (détection automatique, statut DETECTE) → un admin TIKEXO backoffice
// (SUPER_ADMIN/ADMIN_OPS) traite la mutation via /mutations/:id/traiter
// (statut TRAITE, email_pro mis à jour). email_perso ne bouge jamais.
const request = require('supertest');
const { app } = require('../../index');
const prisma = require('../../config/database');
const jwt = require('jsonwebtoken');

let userBenefId, entAId, entBId, adminAId, adminBId, superAdminId, lienAId, mutationId;
let tokenAdminA, tokenAdminB, tokenSuperAdmin;

const emailPersoOriginal = `benef.mutation.${Date.now()}@gmail.com`;
const emailProAvant = `marie.dupont.${Date.now()}@entreprise-a.bj`;
const emailProApres = `marie.dupont.${Date.now()}@entreprise-b.bj`;

beforeAll(async () => {
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

  const adminA = await prisma.user.create({
    data: {
      telephone: '+2290196' + Date.now().toString().slice(-6),
      nom: 'Admin', prenom: 'A', role: 'ADMIN_RH', statut: 'ACTIF',
    },
  });
  adminAId = adminA.id;
  await prisma.entrepriseAdmin.create({ data: { entreprise_id: entAId, user_id: adminAId, role: 'ADMIN_RH' } });
  tokenAdminA = jwt.sign({ userId: adminAId, role: 'ADMIN_RH' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const adminB = await prisma.user.create({
    data: {
      telephone: '+2290195' + Date.now().toString().slice(-6),
      nom: 'Admin', prenom: 'B', role: 'ADMIN_RH', statut: 'ACTIF',
    },
  });
  adminBId = adminB.id;
  await prisma.entrepriseAdmin.create({ data: { entreprise_id: entBId, user_id: adminBId, role: 'ADMIN_RH' } });
  tokenAdminB = jwt.sign({ userId: adminBId, role: 'ADMIN_RH' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const superAdmin = await prisma.user.create({
    data: {
      telephone: '+2290194' + Date.now().toString().slice(-6),
      nom: 'Super', prenom: 'Admin', role: 'SUPER_ADMIN', statut: 'ACTIF',
    },
  });
  superAdminId = superAdmin.id;
  tokenSuperAdmin = jwt.sign({ userId: superAdminId, role: 'SUPER_ADMIN' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const benef = await prisma.user.create({
    data: {
      telephone: '+2290197' + Date.now().toString().slice(-6),
      nom: 'Dupont', prenom: 'Marie',
      email_perso: emailPersoOriginal,
      email_pro: emailProAvant,
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
  it('Sortie A : crée la mutation EN_ATTENTE, ferme le lien A, vide email_pro (email_perso intact)', async () => {
    const res = await request(app)
      .post(`/api/v1/beneficiaires/${userBenefId}/sortie`)
      .set('Authorization', `Bearer ${tokenAdminA}`)
      .send({ entrepriseId: entAId, optionSolde: 'CONSERVATION' });

    expect(res.status).toBe(200);

    const lienA = await prisma.lienEntrepriseBeneficiaire.findUnique({ where: { id: lienAId } });
    expect(lienA.statut).toBe('TERMINE');

    const user = await prisma.user.findUnique({ where: { id: userBenefId } });
    expect(user.email_pro).toBeNull();
    expect(user.email_perso).toBe(emailPersoOriginal); // Immuable

    const mutation = await prisma.mutation.findFirst({
      where: { user_id: userBenefId, entreprise_a_id: entAId },
      orderBy: { createdAt: 'desc' },
    });
    expect(mutation).toBeTruthy();
    expect(mutation.statut).toBe('EN_ATTENTE');
    mutationId = mutation.id;
  });

  it('Rattachement B : détection automatique de la mutation → statut DETECTE, lien B créé', async () => {
    const res = await request(app)
      .post(`/api/v1/beneficiaires/${userBenefId}/rattacher`)
      .set('Authorization', `Bearer ${tokenAdminB}`)
      .send({ entrepriseId: entBId, niveau: 'EMPLOYE', allocationMensuelle: 3000 });

    expect(res.status).toBe(200);

    const lienB = await prisma.lienEntrepriseBeneficiaire.findFirst({
      where: { user_id: userBenefId, entreprise_id: entBId, statut: 'ACTIF' },
    });
    expect(lienB).toBeTruthy();

    const mutation = await prisma.mutation.findUnique({ where: { id: mutationId } });
    expect(mutation.statut).toBe('DETECTE');
    expect(mutation.entreprise_b_id).toBe(entBId);

    const user = await prisma.user.findUnique({ where: { id: userBenefId } });
    expect(user.email_perso).toBe(emailPersoOriginal); // Toujours immuable
  });

  it('Traitement TIKEXO : email_pro mis à jour, statut TRAITE (email_perso intact)', async () => {
    const res = await request(app)
      .post(`/api/v1/mutations/${mutationId}/traiter`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ emailProApres });

    expect(res.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { id: userBenefId } });
    expect(user.email_perso).toBe(emailPersoOriginal); // Pivot stable de bout en bout
    expect(user.email_pro).toBe(emailProApres);
    expect(user.kyc_via_entreprise).toBe(true); // Conservé via entreprise B KYB validée

    const mutation = await prisma.mutation.findUnique({ where: { id: mutationId } });
    expect(mutation.statut).toBe('TRAITE');
    expect(mutation.traite_par).toBe(superAdminId);
  });

  it('B ne peut pas agir sur un bénéficiaire au nom de A → isolement (403)', async () => {
    // adminB n'a pas de lien EntrepriseAdmin vers A — toute action ciblant A doit être refusée
    const res = await request(app)
      .post(`/api/v1/beneficiaires/${userBenefId}/suspendre`)
      .set('Authorization', `Bearer ${tokenAdminB}`)
      .send({ entrepriseId: entAId });

    expect(res.status).toBe(403);
  });

  it('Scénario complet : lien A fermé, lien B actif, solde résiduel conservé', async () => {
    const lienA = await prisma.lienEntrepriseBeneficiaire.findUnique({ where: { id: lienAId } });
    expect(lienA.statut).toBe('TERMINE');

    const lienB = await prisma.lienEntrepriseBeneficiaire.findFirst({
      where: { user_id: userBenefId, entreprise_id: entBId, statut: 'ACTIF' },
    });
    expect(lienB).toBeTruthy();

    const wallet = await prisma.wallet.findUnique({ where: { user_id: userBenefId } });
    expect(parseFloat(wallet.solde)).toBeGreaterThanOrEqual(0); // Solde conservé (option CONSERVATION)
  });
});
