// Service inscription TIKEXO — point d'entrée public
const prisma = require('../../config/database');
const { creerOtp } = require('../../utils/otp');
const { creerCollecte } = require('../fedapay/fedapay.service');
const { logger } = require('../../middlewares/errorHandler');
const { normaliserTelephone, validerTelephone } = require('../../utils/telephone');

async function creerDossierKyb(prisma, entrepriseId) {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);
  return prisma.kybDossier.create({
    data: { entreprise_id: entrepriseId, kyb_deadline: deadline },
  });
}

const PLANS = {
  Starter:  { prix: 15000, commission: 2.00 },
  Growth:   { prix: 35000, commission: 1.80 },
  Business: { prix: 75000, commission: 1.50 },
};

async function inscrire({ entreprise: e, admin: a, plan = 'Growth', recharge = null }) {
  // Normaliser et valider le téléphone
  a.telephone = normaliserTelephone(a.telephone);
  if (!validerTelephone(a.telephone)) {
    const err = new Error('Numéro de téléphone invalide — format attendu : +229 01 XX XX XX XX');
    err.statusCode = 400;
    err.code = 'TELEPHONE_INVALIDE';
    throw err;
  }

  // Vérifier unicité NIF
  const nifExiste = await prisma.entreprise.findUnique({ where: { nif: e.nif } });
  if (nifExiste) {
    const err = new Error('Ce NIF est déjà enregistré sur TIKEXO');
    err.statusCode = 409;
    err.code = 'NIF_DEJA_EXISTANT';
    throw err;
  }

  // Vérifier unicité téléphone
  const telExiste = await prisma.user.findUnique({ where: { telephone: a.telephone } });
  if (telExiste) {
    const err = new Error('Ce numéro de téléphone est déjà associé à un compte TIKEXO');
    err.statusCode = 409;
    err.code = 'TELEPHONE_DEJA_EXISTANT';
    throw err;
  }

  const planConfig = PLANS[plan] || PLANS.Growth;

  // Transaction : entreprise + wallet + user + lien
  const { entreprise: ent, user } = await prisma.$transaction(async (tx) => {
    const entreprise = await tx.entreprise.create({
      data: {
        nom: e.nom,
        nif: e.nif,
        rccm: e.rccm || null,
        secteur: e.secteur || null,
        adresse: e.adresse || null,
        ville: e.ville || 'Cotonou',
        telephone_rh: a.telephone,
        email_rh: a.email_rh || null,
        taux_commission_defaut: planConfig.commission,
        statut: 'EN_ATTENTE',
      },
    });

    await tx.wallet.create({
      data: {
        entreprise_id: entreprise.id,
        type: 'ENTREPRISE',
        currency: 'XOF',
      },
    });

    const newUser = await tx.user.create({
      data: {
        telephone: a.telephone,
        nom: a.nom,
        prenom: a.prenom,
        email_pro: a.email_rh || null,
        role: 'ADMIN_RH',
        statut: 'INACTIF',
      },
    });

    await tx.entrepriseAdmin.create({
      data: {
        entreprise_id: entreprise.id,
        user_id: newUser.id,
        role: 'ADMIN_RH',
      },
    });

    await tx.auditLog.create({
      data: {
        user_id: newUser.id,
        action: 'INSCRIPTION',
        entite: 'Entreprise',
        entite_id: entreprise.id,
        apres: { nom: entreprise.nom, nif: entreprise.nif, plan },
      },
    });

    return { entreprise, user: newUser };
  });

  // Créer le dossier KYB (deadline J+7)
  await creerDossierKyb(prisma, ent.id);

  // Envoyer l'OTP
  const otpCode = await creerOtp(prisma, a.telephone);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`TIKEXO INSCRIPTION OTP [DEV] ${a.telephone}: ${otpCode}`);
  }

  // Recharge initiale si demandée (FedaPay ou mock)
  let rechargeResult = null;
  if (recharge && recharge.montant) {
    const montantNum = parseInt(recharge.montant.toString().replace(/\D/g, ''), 10) || 0;
    if (montantNum >= 10000) {
      try {
        rechargeResult = await creerCollecte(prisma, {
          entrepriseId: ent.id,
          montant: montantNum,
          telephonePayeur: recharge.telephonePayeur || a.telephone,
        });
        rechargeResult._montant = montantNum;
      } catch (err) {
        logger.warn('TIKEXO — Recharge initiale inscription échouée', { err: err.message });
      }
    }
  }

  return {
    entreprise_id: ent.id,
    user_id: user.id,
    telephone: a.telephone,
    plan,
    prix_plan: planConfig.prix,
    message: 'Code OTP envoyé par SMS',
    recharge: rechargeResult ? {
      mock: !!rechargeResult.mock,
      payment_url: rechargeResult.payment_url,
      montant: rechargeResult._montant,
    } : null,
  };
}

module.exports = { inscrire };
