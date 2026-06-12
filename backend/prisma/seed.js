// Seed TIKEXO : super admin + wallet PLATEFORME + données de test
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

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
  const pinHash = await bcrypt.hash('123456', 12);
  const superAdmin = await prisma.user.upsert({
    where: { telephone: '+22997000000' },
    update: {},
    create: {
      telephone: '+22997000000',
      nom: 'TIKEXO',
      prenom: 'Admin',
      email_perso: 'admin@tikexo.bj',
      pin_hash: pinHash,
      role: 'SUPER_ADMIN',
      statut: 'ACTIF',
      kyc_niveau: 'ZERO',
    },
  });
  console.log('✅ Super Admin TIKEXO créé :', superAdmin.id);

  // Admin OPS
  const adminOps = await prisma.user.upsert({
    where: { telephone: '+22997000001' },
    update: {},
    create: {
      telephone: '+22997000001',
      nom: 'TIKEXO',
      prenom: 'Ops',
      email_perso: 'ops@tikexo.bj',
      pin_hash: pinHash,
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
      telephone_rh: '+22997111111',
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
    where: { telephone: '+22997222222' },
    update: {},
    create: {
      telephone: '+22997222222',
      nom: 'Kpossou',
      prenom: 'Jean',
      email_perso: 'jean.kpossou@gmail.com',
      email_pro: 'jean.kpossou@demo.bj',
      pin_hash: pinHash,
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
    where: { telephone: '+22997333333' },
    update: {},
    create: {
      telephone: '+22997333333',
      nom: 'Ahouanmenou',
      prenom: 'Marie',
      email_perso: 'marie.ahouanmenou@gmail.com',
      email_pro: 'marie.ahouanmenou@demo.bj',
      pin_hash: pinHash,
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

  // Lien adminRH → entreprise (permet à l'ADMIN_RH de connaître son entrepriseId)
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
      valeur_titre: 5000,
      taux_participation: 60,
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
      valeur_titre: 2500,
      taux_participation: 60,
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
      telephone_rh: '+22996111000',
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
    where: { telephone: '+22996555555' },
    update: {},
    create: {
      telephone: '+22996555555',
      nom: 'Dossou',
      prenom: 'Sylvain',
      email_perso: 'sylvain.dossou@gmail.com',
      email_pro: 'sylvain.dossou@benintech.bj',
      pin_hash: pinHash,
      role: 'GESTIONNAIRE_RH',
      statut: 'ACTIF',
      kyc_niveau: 'ZERO',
      kyc_via_entreprise: true,
    },
  });
  console.log('✅ Gestionnaire RH 2 créé :', gestionnaireRH.id);

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
      valeur_titre: 5000,
      taux_participation: 60,
      statut: 'ACTIF',
    },
  });
  console.log('✅ Lien gestionnaireRH → entreprise2 créé');

  // ── Bénéficiaire 2 (→ BéninTech) ─────────────────────────────────────────
  const beneficiaire2 = await prisma.user.upsert({
    where: { telephone: '+22996666666' },
    update: {},
    create: {
      telephone: '+22996666666',
      nom: 'Tossou',
      prenom: 'Rodrigue',
      email_perso: 'rodrigue.tossou@gmail.com',
      email_pro: 'rodrigue.tossou@benintech.bj',
      pin_hash: pinHash,
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
      valeur_titre: 2500,
      taux_participation: 60,
      statut: 'ACTIF',
    },
  });
  console.log('✅ Lien bénéficiaire2 → entreprise2 créé');

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
      telephone: '+22997444444',
      nom: 'Restaurant Le Bon Repas',
      type: 'RESTAURANT',
      ifu: 'IFU-DEMO-001',
      adresse: "Rue de l'Industrie, Cotonou",
      ville: 'Cotonou',
      solde: 45000,
    },
    {
      telephone: '+22996777771',
      nom: 'Café Central Cotonou',
      type: 'CAFETERIA',
      ifu: 'IFU-DEMO-002',
      adresse: 'Boulevard Saint Michel, Cotonou',
      ville: 'Cotonou',
      solde: 12000,
    },
    {
      telephone: '+22996777772',
      nom: 'Traiteur Chez Tante Blandine',
      type: 'TRAITEUR',
      ifu: 'IFU-DEMO-003',
      adresse: 'Quartier Akpakpa, Cotonou',
      ville: 'Cotonou',
      solde: 28500,
    },
    {
      telephone: '+22996777773',
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
      update: {},
      create: {
        telephone: c.telephone,
        nom: c.nom,
        prenom: 'Gérant',
        email_perso: `contact@${c.ifu.toLowerCase().replace(/-/g, '')}.bj`,
        pin_hash: pinHash,
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
  console.log('Comptes de test :');
  console.log('  Super Admin      : +22997000000 / PIN: 123456');
  console.log('  Admin OPS        : +22997000001 / PIN: 123456');
  console.log('  Admin RH (démo)  : +22997222222 / PIN: 123456');
  console.log('  Gestionnaire RH  : +22996555555 / PIN: 123456');
  console.log('  Bénéficiaire 1   : +22997333333 / PIN: 123456');
  console.log('  Bénéficiaire 2   : +22996666666 / PIN: 123456');
  console.log('  Commerçant 1     : +22997444444 / PIN: 123456');
  console.log('  Commerçant 2     : +22996777771 / PIN: 123456');
  console.log('  Commerçant 3     : +22996777772 / PIN: 123456');
  console.log('  Commerçant 4     : +22996777773 / PIN: 123456');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed TIKEXO :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
