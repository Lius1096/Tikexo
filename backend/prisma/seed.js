// Seed TIKEXO : super admin + wallet PLATEFORME + données de test
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const carteUtils = require('../src/utils/carte');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seed TIKEXO...');

  // Wallet PLATEFORME TIKEXO (reçoit les commissions)
  const walletPlateforme = await prisma.wallet.upsert({
    where: { id: 'wallet-plateforme-tikexo' },
    update: {},
    create: {
      id: 'wallet-plateforme-tikexo',
      type: 'PLATEFORME',
      solde: 0,
      currency: 'XOF',
      statut: 'ACTIF',
    },
  });
  console.log('✅ Wallet PLATEFORME créé :', walletPlateforme.id);

  // Super Admin TIKEXO
  const pinHash = await bcrypt.hash('1234', 12);
  const passwordHash = await bcrypt.hash('Tikexo@2025!', 12);

  const superAdmin = await prisma.user.upsert({
    where: { telephone: '+2290197000000' },
    update: { mot_de_passe_hash: passwordHash },
    create: {
      telephone: '+2290197000000',
      nom: 'TIKEXO',
      prenom: 'Admin',
      email_perso: 'admin@tikexo.bj',
      pin_hash: pinHash,
      mot_de_passe_hash: passwordHash,
      role: 'SUPER_ADMIN',
      statut: 'ACTIF',
      kyc_niveau: 'ZERO',
    },
  });
  console.log('✅ Super Admin TIKEXO créé :', superAdmin.id);

  // Admin OPS
  const adminOps = await prisma.user.upsert({
    where: { telephone: '+2290197000001' },
    update: { mot_de_passe_hash: passwordHash },
    create: {
      telephone: '+2290197000001',
      nom: 'TIKEXO',
      prenom: 'Ops',
      email_perso: 'ops@tikexo.bj',
      pin_hash: pinHash,
      mot_de_passe_hash: passwordHash,
      role: 'ADMIN_OPS',
      statut: 'ACTIF',
      kyc_niveau: 'ZERO',
    },
  });
  console.log('✅ Admin OPS créé :', adminOps.id);

  // Entreprise de démonstration
  const entrepriseDemo = await prisma.entreprise.upsert({
    where: { nif: 'NIF-DEMO-001' },
    update: {},
    create: {
      nom: 'Société de Démonstration TIKEXO',
      nif: 'NIF-DEMO-001',
      rccm: 'RCCM-DEMO-001',
      secteur: 'Services',
      adresse: 'Avenue Jean Paul II, Cotonou',
      ville: 'Cotonou',
      email_rh: 'rh@demo.bj',
      telephone_rh: '+2290197111111',
      statut: 'ACTIF',
      kyb_valide: true,
      taux_commission_defaut: 2.00,
    },
  });
  console.log('✅ Entreprise démo créée :', entrepriseDemo.id);

  // Wallet entreprise démo
  const walletEntreprise = await prisma.wallet.upsert({
    where: { entreprise_id: entrepriseDemo.id },
    update: {},
    create: {
      entreprise_id: entrepriseDemo.id,
      type: 'ENTREPRISE',
      solde: 500000,
      currency: 'XOF',
      statut: 'ACTIF',
    },
  });
  console.log('✅ Wallet entreprise démo créé :', walletEntreprise.id);

  // Admin RH de l'entreprise démo
  const adminRH = await prisma.user.upsert({
    where: { telephone: '+2290197222222' },
    update: { mot_de_passe_hash: passwordHash },
    create: {
      telephone: '+2290197222222',
      nom: 'Kpossou',
      prenom: 'Jean',
      email_perso: 'jean.kpossou@gmail.com',
      email_pro: 'jean.kpossou@demo.bj',
      pin_hash: pinHash,
      mot_de_passe_hash: passwordHash,
      role: 'ADMIN_RH',
      statut: 'ACTIF',
      kyc_niveau: 'ZERO',
      kyc_via_entreprise: true,
    },
  });
  console.log('✅ Admin RH démo créé :', adminRH.id);

  // Wallet pour adminRH (peut aussi recevoir des dotations en tant que Directeur)
  await prisma.wallet.upsert({
    where: { user_id: adminRH.id },
    update: {},
    create: {
      user_id: adminRH.id,
      type: 'BENEFICIAIRE',
      solde: 0,
      currency: 'XOF',
      statut: 'ACTIF',
    },
  });

  // Bénéficiaire de démonstration
  const beneficiaireDemo = await prisma.user.upsert({
    where: { telephone: '+2290197333333' },
    update: { mot_de_passe_hash: passwordHash },
    create: {
      telephone: '+2290197333333',
      nom: 'Ahouanmenou',
      prenom: 'Marie',
      email_perso: 'marie.ahouanmenou@gmail.com',
      email_pro: 'marie.ahouanmenou@demo.bj',
      pin_hash: pinHash,
      mot_de_passe_hash: passwordHash,
      role: 'BENEFICIAIRE',
      statut: 'ACTIF',
      kyc_niveau: 'ZERO',
      kyc_via_entreprise: true,
    },
  });
  console.log('✅ Bénéficiaire démo créé :', beneficiaireDemo.id);

  // Wallet bénéficiaire démo
  const walletBenef = await prisma.wallet.upsert({
    where: { user_id: beneficiaireDemo.id },
    update: {},
    create: {
      user_id: beneficiaireDemo.id,
      type: 'BENEFICIAIRE',
      solde: 17500,
      currency: 'XOF',
      statut: 'ACTIF',
    },
  });
  console.log('✅ Wallet bénéficiaire démo créé :', walletBenef.id);

  // EntrepriseAdmin : lien RH officiel (utilisé par le middleware auth pour req.user.entrepriseId)
  await prisma.entrepriseAdmin.upsert({
    where: { user_id: adminRH.id },
    update: {},
    create: {
      entreprise_id: entrepriseDemo.id,
      user_id: adminRH.id,
      role: 'ADMIN_RH',
    },
  });
  console.log('✅ EntrepriseAdmin adminRH créé');

  // Lien adminRH → entreprise en tant que bénéficiaire (Directeur qui perçoit aussi des titres-repas)
  await prisma.lienEntrepriseBeneficiaire.upsert({
    where: {
      entreprise_id_user_id_statut: {
        entreprise_id: entrepriseDemo.id,
        user_id: adminRH.id,
        statut: 'ACTIF',
      },
    },
    update: {},
    create: {
      entreprise_id: entrepriseDemo.id,
      user_id: adminRH.id,
      niveau: 'DIRECTEUR',
      allocation_mensuelle: 15000,
      statut: 'ACTIF',
    },
  });
  console.log('✅ Lien adminRH → entreprise créé');

  // Lien bénéficiaire → entreprise
  await prisma.lienEntrepriseBeneficiaire.upsert({
    where: {
      entreprise_id_user_id_statut: {
        entreprise_id: entrepriseDemo.id,
        user_id: beneficiaireDemo.id,
        statut: 'ACTIF',
      },
    },
    update: {},
    create: {
      entreprise_id: entrepriseDemo.id,
      user_id: beneficiaireDemo.id,
      niveau: 'EMPLOYE',
      allocation_mensuelle: 5000,
      statut: 'ACTIF',
    },
  });
  console.log('✅ Lien bénéficiaire → entreprise créé');

  // ── Entreprise 2 ──────────────────────────────────────────────────────────
  const entreprise2 = await prisma.entreprise.upsert({
    where: { nif: 'NIF-DEMO-002' },
    update: {},
    create: {
      nom: 'BéninTech Industries',
      nif: 'NIF-DEMO-002',
      rccm: 'RCCM-DEMO-002',
      secteur: 'Technologie',
      adresse: 'Zone Industrielle de Glo-Djigbé',
      ville: 'Abomey-Calavi',
      email_rh: 'rh@benintech.bj',
      telephone_rh: '+2290196111000',
      statut: 'ACTIF',
      kyb_valide: true,
      taux_commission_defaut: 2.00,
    },
  });
  console.log('✅ Entreprise 2 créée :', entreprise2.id);

  await prisma.wallet.upsert({
    where: { entreprise_id: entreprise2.id },
    update: {},
    create: {
      entreprise_id: entreprise2.id,
      type: 'ENTREPRISE',
      solde: 750000,
      currency: 'XOF',
      statut: 'ACTIF',
    },
  });

  // ── Employeur 2 (GESTIONNAIRE_RH → BéninTech) ─────────────────────────────
  const gestionnaireRH = await prisma.user.upsert({
    where: { telephone: '+2290196555555' },
    update: { mot_de_passe_hash: passwordHash },
    create: {
      telephone: '+2290196555555',
      nom: 'Dossou',
      prenom: 'Sylvain',
      email_perso: 'sylvain.dossou@gmail.com',
      email_pro: 'sylvain.dossou@benintech.bj',
      pin_hash: pinHash,
      mot_de_passe_hash: passwordHash,
      role: 'GESTIONNAIRE_RH',
      statut: 'ACTIF',
      kyc_niveau: 'ZERO',
      kyc_via_entreprise: true,
    },
  });
  console.log('✅ Gestionnaire RH 2 créé :', gestionnaireRH.id);

  // EntrepriseAdmin : lien RH officiel pour BéninTech
  await prisma.entrepriseAdmin.upsert({
    where: { user_id: gestionnaireRH.id },
    update: {},
    create: {
      entreprise_id: entreprise2.id,
      user_id: gestionnaireRH.id,
      role: 'GESTIONNAIRE_RH',
    },
  });
  console.log('✅ EntrepriseAdmin gestionnaireRH créé');

  // Lien gestionnaireRH → entreprise2 en tant que bénéficiaire (Directeur)
  await prisma.lienEntrepriseBeneficiaire.upsert({
    where: {
      entreprise_id_user_id_statut: {
        entreprise_id: entreprise2.id,
        user_id: gestionnaireRH.id,
        statut: 'ACTIF',
      },
    },
    update: {},
    create: {
      entreprise_id: entreprise2.id,
      user_id: gestionnaireRH.id,
      niveau: 'DIRECTEUR',
      allocation_mensuelle: 15000,
      statut: 'ACTIF',
    },
  });
  console.log('✅ Lien gestionnaireRH → entreprise2 créé');

  // ── Bénéficiaire 2 (→ BéninTech) ─────────────────────────────────────────
  const beneficiaire2 = await prisma.user.upsert({
    where: { telephone: '+2290196666666' },
    update: { mot_de_passe_hash: passwordHash },
    create: {
      telephone: '+2290196666666',
      nom: 'Tossou',
      prenom: 'Rodrigue',
      email_perso: 'rodrigue.tossou@gmail.com',
      email_pro: 'rodrigue.tossou@benintech.bj',
      pin_hash: pinHash,
      mot_de_passe_hash: passwordHash,
      role: 'BENEFICIAIRE',
      statut: 'ACTIF',
      kyc_niveau: 'ZERO',
      kyc_via_entreprise: true,
    },
  });
  console.log('✅ Bénéficiaire 2 créé :', beneficiaire2.id);

  const walletBenef2 = await prisma.wallet.upsert({
    where: { user_id: beneficiaire2.id },
    update: {},
    create: {
      user_id: beneficiaire2.id,
      type: 'BENEFICIAIRE',
      solde: 8500,
      currency: 'XOF',
      statut: 'ACTIF',
    },
  });

  await prisma.lienEntrepriseBeneficiaire.upsert({
    where: {
      entreprise_id_user_id_statut: {
        entreprise_id: entreprise2.id,
        user_id: beneficiaire2.id,
        statut: 'ACTIF',
      },
    },
    update: {},
    create: {
      entreprise_id: entreprise2.id,
      user_id: beneficiaire2.id,
      niveau: 'EMPLOYE',
      allocation_mensuelle: 5000,
      statut: 'ACTIF',
    },
  });
  console.log('✅ Lien bénéficiaire2 → entreprise2 créé');

  // ── Cartes virtuelles pour les bénéficiaires ─────────────────────────────
  for (const userId of [adminRH.id, beneficiaireDemo.id, gestionnaireRH.id, beneficiaire2.id]) {
    const existante = await prisma.carteDigi.findFirst({ where: { user_id: userId, statut: 'ACTIVE' } });
    if (!existante) {
      const { hash, suffixe, numeroMasque } = await carteUtils.genererNumeroCarte(prisma);
      await prisma.carteDigi.create({
        data: {
          user_id       : userId,
          type          : 'VIRTUELLE',
          numero_hash   : hash,
          numero_masque : numeroMasque,
          prefixe       : '4782',
          suffixe,
          date_expiration: carteUtils.genererDateExpiration(),
          statut        : 'ACTIVE',
        },
      });
      console.log(`✅ Carte virtuelle créée pour user ${userId}`);
    }
  }

  // ── LedgerEntry de démo (historique transactions) ────────────────────────
  // Wallets entreprises pour sourcer les dotations
  const walletEnt1 = await prisma.wallet.findUnique({ where: { entreprise_id: entrepriseDemo.id } });
  const walletEnt2 = await prisma.wallet.findUnique({ where: { entreprise_id: entreprise2.id } });

  const ledgerEntries = [
    // Marie Ahouanmenou — 3 dotations employeur
    { id: 'seed-ledger-001', wallet_source_id: walletEnt1?.id, wallet_destination_id: walletBenef.id, montant: 6000, type: 'DOTATION', source_entreprise_id: entrepriseDemo.id, createdAt: new Date('2026-04-01') },
    { id: 'seed-ledger-002', wallet_source_id: walletEnt1?.id, wallet_destination_id: walletBenef.id, montant: 5500, type: 'DOTATION', source_entreprise_id: entrepriseDemo.id, createdAt: new Date('2026-05-01') },
    { id: 'seed-ledger-003', wallet_source_id: walletEnt1?.id, wallet_destination_id: walletBenef.id, montant: 6000, type: 'DOTATION', source_entreprise_id: entrepriseDemo.id, createdAt: new Date('2026-06-01') },
    // Rodrigue Tossou — 2 dotations employeur
    { id: 'seed-ledger-004', wallet_source_id: walletEnt2?.id, wallet_destination_id: walletBenef2.id, montant: 4500, type: 'DOTATION', source_entreprise_id: entreprise2.id, createdAt: new Date('2026-05-01') },
    { id: 'seed-ledger-005', wallet_source_id: walletEnt2?.id, wallet_destination_id: walletBenef2.id, montant: 4000, type: 'DOTATION', source_entreprise_id: entreprise2.id, createdAt: new Date('2026-06-01') },
  ];

  for (const entry of ledgerEntries) {
    await prisma.ledgerEntry.upsert({
      where: { id: entry.id },
      update: {},
      create: entry,
    });
  }
  console.log('✅ LedgerEntry de démo créées');

  // ── Commerçants (4 au total) ───────────────────────────────────────────────
  const commercantsData = [
    {
      telephone: '+2290197444444',
      nom: 'Restaurant Le Bon Repas',
      type: 'RESTAURANT',
      ifu: 'IFU-DEMO-001',
      adresse: "Rue de l'Industrie, Cotonou",
      ville: 'Cotonou',
      solde: 45000,
    },
    {
      telephone: '+2290196777771',
      nom: 'Café Central Cotonou',
      type: 'CAFETERIA',
      ifu: 'IFU-DEMO-002',
      adresse: 'Boulevard Saint Michel, Cotonou',
      ville: 'Cotonou',
      solde: 12000,
    },
    {
      telephone: '+2290196777772',
      nom: 'Traiteur Chez Tante Blandine',
      type: 'TRAITEUR',
      ifu: 'IFU-DEMO-003',
      adresse: 'Quartier Akpakpa, Cotonou',
      ville: 'Cotonou',
      solde: 28500,
    },
    {
      telephone: '+2290196777773',
      nom: 'Supermarché Étoile du Bénin',
      type: 'SUPERMARCHE',
      ifu: 'IFU-DEMO-004',
      adresse: 'Agence Etoile, Cotonou',
      ville: 'Cotonou',
      solde: 0,
    },
  ];

  for (const c of commercantsData) {
    const uCommercant = await prisma.user.upsert({
      where: { telephone: c.telephone },
      update: { mot_de_passe_hash: passwordHash },
      create: {
        telephone: c.telephone,
        nom: c.nom,
        prenom: 'Gérant',
        email_perso: `contact@${c.ifu.toLowerCase().replace(/-/g, '')}.bj`,
        pin_hash: pinHash,
        mot_de_passe_hash: passwordHash,
        role: 'COMMERCANT',
        statut: 'ACTIF',
        kyc_niveau: 'KYB',
      },
    });
    const comm = await prisma.commercant.upsert({
      where: { user_id: uCommercant.id },
      update: {},
      create: {
        user_id: uCommercant.id,
        nom: c.nom,
        type: c.type,
        ifu: c.ifu,
        niveau: 'VERIFIE',
        mobile_money_numero: c.telephone,
        mobile_money_operateur: 'MTN',
        adresse: c.adresse,
        ville: c.ville,
        statut: 'ACTIF',
        taux_commission: 2.00,
        mode_reversement: 'AUTO_72H',
      },
    });
    await prisma.wallet.upsert({
      where: { user_id: uCommercant.id },
      update: {},
      create: {
        user_id: uCommercant.id,
        type: 'COMMERCANT',
        solde: c.solde,
        currency: 'XOF',
        statut: 'ACTIF',
      },
    });
    console.log('✅ Commerçant créé :', comm.nom);
  }

  console.log('🎉 Seed TIKEXO terminé avec succès !');
  console.log('');
  console.log('Comptes de test (email / mot de passe : Tikexo@2025!) :');
  console.log('  Super Admin      : admin@tikexo.bj');
  console.log('  Admin OPS        : ops@tikexo.bj');
  console.log('  Admin RH (démo)  : jean.kpossou@gmail.com');
  console.log('  Gestionnaire RH  : sylvain.dossou@gmail.com');
  console.log('  Bénéficiaire 1   : marie.ahouanmenou@gmail.com');
  console.log('  Bénéficiaire 2   : rodrigue.tossou@gmail.com');
  console.log('  Commerçant 1     : contact@ifudemo001.bj');
  console.log('  Commerçant 2     : contact@ifudemo002.bj');
  console.log('  Commerçant 3     : contact@ifudemo003.bj');
  console.log('  Commerçant 4     : contact@ifudemo004.bj');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed TIKEXO :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
