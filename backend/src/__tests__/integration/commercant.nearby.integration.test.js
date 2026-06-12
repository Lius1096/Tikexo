// Tests d'intégration — GET /api/v1/commercants/nearby TIKEXO
const request = require('supertest');
const { app } = require('../../index');
const prisma = require('../../config/database');
const jwt = require('jsonwebtoken');

// Coordonnées réelles Cotonou (centre) — position utilisateur test
const LAT_USER = 6.3654;
const LNG_USER = 2.4183;

// 5 commerçants avec coords GPS réelles autour de Cotonou
const COMMERCANTS_SEED = [
  { nom: 'Restaurant Le Bénin', type: 'RESTAURANT', lat: 6.3670, lng: 2.4195, statut: 'ACTIF' },    // ~200 m
  { nom: 'Boulangerie Centrale',type: 'BOULANGERIE', lat: 6.3700, lng: 2.4220, statut: 'ACTIF' },   // ~600 m
  { nom: 'Épicerie du Marché', type: 'EPICERIE',   lat: 6.3750, lng: 2.4260, statut: 'ACTIF' },    // ~1200 m
  { nom: 'Restaurant Loin',    type: 'RESTAURANT', lat: 6.4000, lng: 2.4400, statut: 'ACTIF' },    // ~4300 m
  { nom: 'Restaurant Suspendu',type: 'RESTAURANT', lat: 6.3675, lng: 2.4200, statut: 'SUSPENDU' }, // ~220 m mais suspendu
];

const HORAIRES_OUVERT = {
  lundi:    { ouverture: '00:00', fermeture: '23:59' },
  mardi:    { ouverture: '00:00', fermeture: '23:59' },
  mercredi: { ouverture: '00:00', fermeture: '23:59' },
  jeudi:    { ouverture: '00:00', fermeture: '23:59' },
  vendredi: { ouverture: '00:00', fermeture: '23:59' },
  samedi:   { ouverture: '00:00', fermeture: '23:59' },
  dimanche: null,
};

const HORAIRES_FERME = {
  lundi:    { ouverture: '00:00', fermeture: '00:01' }, // Pratiquement toujours fermé
  mardi:    { ouverture: '00:00', fermeture: '00:01' },
  mercredi: { ouverture: '00:00', fermeture: '00:01' },
  jeudi:    { ouverture: '00:00', fermeture: '00:01' },
  vendredi: { ouverture: '00:00', fermeture: '00:01' },
  samedi:   { ouverture: '00:00', fermeture: '00:01' },
  dimanche: null,
};

let tokenBenef;
let commercantIds = [];
let userIds = [];

beforeAll(async () => {
  const benef = await prisma.user.create({
    data: {
      telephone: '+22961' + Date.now().toString().slice(-6),
      nom: 'Test', prenom: 'Nearby',
      role: 'BENEFICIAIRE', statut: 'ACTIF',
    },
  });
  tokenBenef = jwt.sign({ userId: benef.id, role: 'BENEFICIAIRE' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  userIds.push(benef.id);

  for (const seed of COMMERCANTS_SEED) {
    const user = await prisma.user.create({
      data: {
        telephone: '+22962' + Date.now().toString().slice(-6) + Math.random().toString().slice(2, 5),
        nom: seed.nom, prenom: 'Gérant',
        role: 'COMMERCANT', statut: 'ACTIF',
      },
    });
    userIds.push(user.id);

    const comm = await prisma.commercant.create({
      data: {
        user_id: user.id,
        nom: seed.nom,
        type: seed.type,
        niveau: 'VERIFIE',
        mobile_money_numero: '+22961000000',
        mobile_money_operateur: 'MTN',
        statut: seed.statut,
        taux_commission: 2.0,
        latitude: seed.lat,
        longitude: seed.lng,
        adresse: 'Cotonou',
        ville: 'Cotonou',
        horaires: seed.statut === 'ACTIF' ? HORAIRES_OUVERT : HORAIRES_FERME,
      },
    });
    commercantIds.push(comm.id);

    await prisma.wallet.create({
      data: { user_id: user.id, type: 'COMMERCANT', currency: 'XOF' },
    });
  }
});

afterAll(async () => {
  for (const id of commercantIds) {
    await prisma.commercant.delete({ where: { id } }).catch(() => {});
  }
  for (const id of userIds) {
    await prisma.user.delete({ where: { id } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe('GET /api/v1/commercants/nearby — Intégration TIKEXO', () => {
  it('Retourne uniquement les commerçants dans le rayon 1000 m, triés par distance ASC', async () => {
    const res = await request(app)
      .get(`/api/v1/commercants/nearby?lat=${LAT_USER}&lng=${LNG_USER}&rayon=1000`)
      .set('Authorization', `Bearer ${tokenBenef}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.length).toBeGreaterThanOrEqual(2); // Restaurant Le Bénin + Boulangerie Centrale

    // Vérifier tri par distance ASC
    for (let i = 1; i < data.length; i++) {
      expect(data[i].distance_metres).toBeGreaterThanOrEqual(data[i - 1].distance_metres);
    }

    // Vérifier que les champs de distance sont présents
    expect(data[0]).toHaveProperty('distance_metres');
    expect(data[0]).toHaveProperty('distance_label');
    expect(data[0]).toHaveProperty('duree_a_pied');
  });

  it('Commerçant SUSPENDU → jamais retourné dans /nearby', async () => {
    const res = await request(app)
      .get(`/api/v1/commercants/nearby?lat=${LAT_USER}&lng=${LNG_USER}&rayon=500`)
      .set('Authorization', `Bearer ${tokenBenef}`);

    expect(res.status).toBe(200);
    const noms = res.body.data.map((c) => c.nom);
    expect(noms).not.toContain('Restaurant Suspendu');
  });

  it('Commerçant hors rayon (4.3 km) non retourné avec rayon=2000', async () => {
    const res = await request(app)
      .get(`/api/v1/commercants/nearby?lat=${LAT_USER}&lng=${LNG_USER}&rayon=2000`)
      .set('Authorization', `Bearer ${tokenBenef}`);

    expect(res.status).toBe(200);
    const noms = res.body.data.map((c) => c.nom);
    expect(noms).not.toContain('Restaurant Loin');
  });

  it('Filtre categorie=RESTAURANT → uniquement les restaurants', async () => {
    const res = await request(app)
      .get(`/api/v1/commercants/nearby?lat=${LAT_USER}&lng=${LNG_USER}&rayon=5000&categorie=RESTAURANT`)
      .set('Authorization', `Bearer ${tokenBenef}`);

    expect(res.status).toBe(200);
    res.body.data.forEach((c) => {
      expect(c.type).toBe('RESTAURANT');
    });
  });

  it('meta contient total, rayon_metres, position', async () => {
    const res = await request(app)
      .get(`/api/v1/commercants/nearby?lat=${LAT_USER}&lng=${LNG_USER}&rayon=2000`)
      .set('Authorization', `Bearer ${tokenBenef}`);

    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({
      rayon_metres: 2000,
      position: { lat: LAT_USER, lng: LNG_USER },
    });
    expect(res.body.meta).toHaveProperty('total');
  });

  it('400 si lat manquant', async () => {
    const res = await request(app)
      .get(`/api/v1/commercants/nearby?lng=${LNG_USER}`)
      .set('Authorization', `Bearer ${tokenBenef}`);

    expect(res.status).toBe(400);
  });

  it('400 si lng manquant', async () => {
    const res = await request(app)
      .get(`/api/v1/commercants/nearby?lat=${LAT_USER}`)
      .set('Authorization', `Bearer ${tokenBenef}`);

    expect(res.status).toBe(400);
  });

  it('401 sans token JWT', async () => {
    const res = await request(app)
      .get(`/api/v1/commercants/nearby?lat=${LAT_USER}&lng=${LNG_USER}`);

    expect(res.status).toBe(401);
  });

  it('distance_label présente : < 1000 m → format "X m", >= 1000 m → format "X,X km"', async () => {
    const res = await request(app)
      .get(`/api/v1/commercants/nearby?lat=${LAT_USER}&lng=${LNG_USER}&rayon=5000`)
      .set('Authorization', `Bearer ${tokenBenef}`);

    expect(res.status).toBe(200);

    res.body.data.forEach((c) => {
      if (c.distance_metres < 1000) {
        expect(c.distance_label).toMatch(/^\d+ m$/);
      } else {
        expect(c.distance_label).toMatch(/^\d+,\d km$/);
      }
    });
  });

  it('duree_a_pied présente et au format "~X min"', async () => {
    const res = await request(app)
      .get(`/api/v1/commercants/nearby?lat=${LAT_USER}&lng=${LNG_USER}&rayon=2000`)
      .set('Authorization', `Bearer ${tokenBenef}`);

    expect(res.status).toBe(200);
    res.body.data.forEach((c) => {
      expect(c.duree_a_pied).toMatch(/^~\d+ min$/);
    });
  });
});

describe('GET /api/v1/commercants/:id/fiche — Intégration TIKEXO', () => {
  it('Fiche commerçant avec distance si lat/lng fournis', async () => {
    if (commercantIds.length === 0) return;

    const idActif = commercantIds[0]; // Premier = Restaurant Le Bénin, ACTIF
    const res = await request(app)
      .get(`/api/v1/commercants/${idActif}/fiche?lat=${LAT_USER}&lng=${LNG_USER}`)
      .set('Authorization', `Bearer ${tokenBenef}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('distance_metres');
    expect(res.body.data).toHaveProperty('est_ouvert');
    expect(res.body.data.id).toBe(idActif);
  });

  it('Fiche commerçant sans distance si lat/lng absents', async () => {
    if (commercantIds.length === 0) return;

    const idActif = commercantIds[0];
    const res = await request(app)
      .get(`/api/v1/commercants/${idActif}/fiche`)
      .set('Authorization', `Bearer ${tokenBenef}`);

    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('distance_metres');
    expect(res.body.data).toHaveProperty('est_ouvert');
  });

  it('404 pour un ID inexistant', async () => {
    const res = await request(app)
      .get('/api/v1/commercants/id-inexistant-tikexo/fiche')
      .set('Authorization', `Bearer ${tokenBenef}`);

    expect(res.status).toBe(404);
  });
});
