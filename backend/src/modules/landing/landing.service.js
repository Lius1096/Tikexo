const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULTS = {
  hero: {
    slides: [
      {
        bg: '#0D1F35',
        panelBg: 'rgba(6,14,24,0.82)',
        textColor: '#FFFFFF',
        accent: '#0EA5E9',
        badge: 'Nouveauté 2025',
        title: 'Le repas\nd\'entreprise\nreinventé.',
        subtitle: 'TIKEXO digitalise les tickets restaurant en Afrique de l\'Ouest.',
        ctaPrimary: 'Démarrer gratuitement',
        ctaSecondary: 'Voir la démo',
      },
    ],
  },
  stats: {
    items: [
      { val: '142', label: 'Restaurants partenaires' },
      { val: '3 200+', label: 'Salariés actifs' },
      { val: '98 %', label: 'Taux de satisfaction' },
      { val: '< 5 s', label: 'Paiement QR code' },
    ],
  },
  how_it_works: {
    title: 'Comment ça marche ?',
    subtitle: 'En 3 étapes simples pour les employeurs, les salariés et les commerçants.',
    steps: [
      { num: '01', title: 'Inscrivez votre entreprise', desc: 'Créez votre compte en moins de 5 minutes, ajoutez vos salariés et définissez les dotations mensuelles.', highlight: false },
      { num: '02', title: 'Rechargez le wallet', desc: 'Effectuez un virement ou un paiement Mobile Money. Les fonds sont redistribués automatiquement selon les règles que vous avez définies.', highlight: true },
      { num: '03', title: 'Les salariés paient partout', desc: 'Vos équipes scannent le QR code chez n\'importe quel commerçant partenaire. Instantané, sécurisé, sans espèces.', highlight: false },
    ],
  },
  actors: {
    title: 'Une solution pour chacun',
    subtitle: 'TIKEXO connecte employeurs, salariés et commerçants dans un système unifié.',
    cards: [
      {
        name: 'Employeur',
        role: 'Direction RH / Finance',
        tag: 'Portail web',
        img: '',
        imgAlt: 'Équipe RH en réunion',
        accentFrom: '#1A3C5E',
        accentTo: '#0EA5E9',
        loginHref: '/entreprise/connexion',
        loginLabel: 'Accéder au portail RH',
        features: [
          'Rechargement wallet en 1 clic via Mobile Money',
          'Dotation automatique par niveau hiérarchique',
          'Dashboard temps réel : dépenses, soldes, historique',
        ],
      },
      {
        name: 'Salarié bénéficiaire',
        role: 'Application mobile & web',
        tag: 'App mobile',
        img: '',
        imgAlt: 'Salariés au déjeuner',
        accentFrom: '#065F46',
        accentTo: '#34d399',
        loginHref: '/login',
        loginLabel: 'Accéder à mon wallet',
        features: [
          'Wallet rechargé automatiquement chaque mois',
          'Paiement QR code en moins de 5 secondes',
          'Réseau de 142 restaurants partenaires à Cotonou',
        ],
      },
      {
        name: 'Commerçant partenaire',
        role: 'Caisse numérique TIKEXO',
        tag: 'Caisse TIKEXO',
        img: '',
        imgAlt: 'Commerçante partenaire TIKEXO',
        accentFrom: '#78350F',
        accentTo: '#F59E0B',
        loginHref: '/restaurant/connexion',
        loginLabel: 'Accéder à ma caisse',
        features: [
          'QR code : paiements validés instantanément',
          'Reversement Mobile Money hebdomadaire automatique',
          'Commission réduite vs Mobile Money classique',
        ],
      },
    ],
  },
  pricing: {
    title: 'Des frais clairs, une rentabilité immédiate.',
    subtitle: 'Frais de gestion selon votre effectif + 5 % sur chaque transaction côté salarié et commerçant. Aucun frais caché.',
    plans: [
      {
        name: 'PME · S',
        price: '5 000',
        period: 'XOF / mois · 1 à 50 salariés',
        features: [
          'Portail RH + app salariés',
          'Dotations automatiques',
          '5 % de frais côté salarié par transaction',
          '5 % de frais côté commerçant',
          'Support email',
        ],
      },
      {
        name: 'PME · M',
        price: '25 000',
        period: 'XOF / mois · 51 à 200 salariés',
        featured: true,
        badge: 'Le plus populaire',
        features: [
          'Portail RH + app salariés',
          'Gestion par niveaux hiérarchiques',
          'Dotations automatiques',
          'Exports comptables + factures PDF',
          '5 % côté salarié · 5 % côté commerçant',
        ],
      },
      {
        name: 'ETI / GE',
        price: '200 – 350',
        period: 'XOF × nb salariés / mois · 201 salariés et +',
        features: [
          '201–500 salariés : 200 XOF × effectif',
          '501 salariés et + : 350 XOF × effectif',
          'Mutations inter-entreprises',
          'KYB entreprise prioritaire',
          'Support dédié · 5 % sur transactions',
        ],
        ctaLabel: "Contacter l'équipe",
      },
    ],
  },
  cta: {
    title: 'Prêt à moderniser\nvos avantages salariaux ?',
    subtitle: 'Rejoignez les entreprises qui font confiance à TIKEXO.',
    ctaPrimary: 'Commencer maintenant',
    ctaSecondary: 'Parler à un conseiller',
  },
};

async function getAllConfig() {
  const rows = await prisma.landingConfig.findMany();
  const result = { ...DEFAULTS };
  for (const row of rows) {
    result[row.section] = row.data;
  }
  return result;
}

async function getSection(section) {
  const row = await prisma.landingConfig.findUnique({ where: { section } });
  return row ? row.data : (DEFAULTS[section] ?? null);
}

async function upsertSection(section, data) {
  return prisma.landingConfig.upsert({
    where: { section },
    update: { data },
    create: { section, data },
  });
}

module.exports = { getAllConfig, getSection, upsertSection, DEFAULTS };
