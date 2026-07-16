// Service d'authentification TIKEXO
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../../config/database');
const { creerOtp, verifierOtp: verifierOtpUtil } = require('../../utils/otp');
const { normaliserTelephone, validerTelephone } = require('../../utils/telephone');
const { envoyerEmail, masquerEmail } = require('../../utils/email');
const templates = require('../../utils/emailTemplates');
const { envoyerOtpSms } = require('../../config/sms');

const BCRYPT_ROUNDS = 12;

function genererTokens(userId, role) {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
}

async function demanderOtp(telephoneRaw) {
  const telephone = normaliserTelephone(telephoneRaw);

  if (!validerTelephone(telephone)) {
    const err = new Error('Numéro de téléphone invalide — format attendu : +229 01 XX XX XX XX');
    err.statusCode = 400;
    err.code = 'TELEPHONE_INVALIDE';
    throw err;
  }

  // Vérifier que le numéro existe ou créer un compte INACTIF
  let user = await prisma.user.findUnique({ where: { telephone } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        telephone,
        nom: '',
        prenom: '',
        role: 'BENEFICIAIRE',
        statut: 'INACTIF',
      },
    });
  }

  const code = await creerOtp(prisma, telephone);
  await envoyerOtpSms(telephone, code);

  return { telephone, message: 'Code OTP envoyé par SMS' };
}

async function verifierOtp(telephoneRaw, code) {
  const telephone = normaliserTelephone(telephoneRaw);
  const resultat = await verifierOtpUtil(prisma, telephone, code);

  if (!resultat.valide) {
    const err = new Error(resultat.motif);
    err.statusCode = 401;
    throw err;
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { telephone } });

  // Un employeur (ADMIN_RH / GESTIONNAIRE_RH) reste INACTIF jusqu'à la validation KYB par l'admin.
  // La connexion est bloquée tant que le compte n'a pas été activé par l'équipe TIKEXO.
  if (user.statut === 'INACTIF') {
    const errStatut = new Error(
      user.role === 'ADMIN_RH' || user.role === 'GESTIONNAIRE_RH'
        ? 'Votre compte est en attente de validation KYB. Vous recevrez un SMS dès que votre dossier est approuvé.'
        : 'Votre compte est en attente d\'activation. Contactez votre employeur ou le support TIKEXO.'
    );
    errStatut.statusCode = 403;
    errStatut.code = 'COMPTE_INACTIF';
    throw errStatut;
  }

  if (user.statut === 'BLOQUE') {
    const err = new Error('Votre compte a été suspendu. Contactez le support TIKEXO.');
    err.statusCode = 403; err.code = 'COMPTE_BLOQUE'; throw err;
  }

  const tokens = genererTokens(user.id, user.role);

  await prisma.auditLog.create({
    data: {
      user_id: user.id,
      action: 'CONNEXION_OTP',
      entite: 'User',
      entite_id: user.id,
    },
  });

  // Indique au frontend si l'utilisateur doit créer son PIN
  const pin_requis = !user.pin_hash;

  return { ...tokens, pin_requis, user: { id: user.id, role: user.role, nom: user.nom, prenom: user.prenom } };
}

async function statutPin(telephoneRaw) {
  const telephone = normaliserTelephone(telephoneRaw);
  const user = await prisma.user.findUnique({
    where: { telephone },
    select: { pin_hash: true },
  });
  return { pin_actif: !!(user?.pin_hash) };
}

async function refreshToken(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.userId } });
    return genererTokens(user.id, user.role);
  } catch {
    const err = new Error('Refresh token invalide ou expiré');
    err.statusCode = 401;
    throw err;
  }
}

async function definirPin(userId, pin) {
  if (!/^\d{4,6}$/.test(pin)) {
    const err = new Error('Le PIN doit contenir 4 à 6 chiffres');
    err.statusCode = 400;
    throw err;
  }

  const pinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { pin_hash: pinHash },
  });

  await prisma.auditLog.create({
    data: {
      user_id: userId,
      action: 'PIN_DEFINI',
      entite: 'User',
      entite_id: userId,
    },
  });

  return { success: true };
}

const PIN_MAX_TENTATIVES = 3;
const PIN_BLOCAGE_MINUTES = 15;

async function verifierPin(telephoneRaw, pin) {
  const telephone = normaliserTelephone(telephoneRaw);
  const user = await prisma.user.findUnique({ where: { telephone } });

  if (!user) {
    const err = new Error('Numéro de téléphone non reconnu'); err.statusCode = 401; throw err;
  }
  if (user.statut === 'INACTIF') {
    const err = new Error('Compte en attente de validation KYB — connexion non autorisée');
    err.statusCode = 403; err.code = 'COMPTE_INACTIF'; throw err;
  }
  if (user.statut === 'BLOQUE') {
    const err = new Error('Compte suspendu — contactez le support TIKEXO');
    err.statusCode = 403; err.code = 'COMPTE_BLOQUE'; throw err;
  }
  if (!user.pin_hash) {
    const err = new Error('PIN non configuré — utilisez le code OTP');
    err.statusCode = 401;
    throw err;
  }

  // Vérifier le blocage brute-force via les tentatives récentes
  const tentativesRecentes = await prisma.auditLog.count({
    where: {
      user_id: user.id,
      action: 'PIN_ECHEC',
      createdAt: { gte: new Date(Date.now() - PIN_BLOCAGE_MINUTES * 60 * 1000) },
    },
  });

  if (tentativesRecentes >= PIN_MAX_TENTATIVES) {
    const err = new Error(`Trop de tentatives — réessayez dans ${PIN_BLOCAGE_MINUTES} minutes ou utilisez l'OTP`);
    err.statusCode = 429;
    throw err;
  }

  const correct = await bcrypt.compare(pin, user.pin_hash);

  if (!correct) {
    await prisma.auditLog.create({
      data: { user_id: user.id, action: 'PIN_ECHEC', entite: 'User', entite_id: user.id },
    });
    const restantes = PIN_MAX_TENTATIVES - tentativesRecentes - 1;
    const err = new Error(`PIN incorrect — ${restantes} tentative${restantes > 1 ? 's' : ''} restante${restantes > 1 ? 's' : ''}`);
    err.statusCode = 401;
    throw err;
  }

  const tokens = genererTokens(user.id, user.role);

  await prisma.auditLog.create({
    data: { user_id: user.id, action: 'CONNEXION_PIN', entite: 'User', entite_id: user.id },
  });

  return { ...tokens, pin_requis: false, user: { id: user.id, role: user.role, nom: user.nom, prenom: user.prenom } };
}

async function getProfil(userId) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      telephone: true,
      nom: true,
      prenom: true,
      email_perso: true,
      email_pro: true,
      role: true,
      statut: true,
      kyc_niveau: true,
      kyc_via_entreprise: true,
      biometrie_activee: true,
      langue: true,
      createdAt: true,
      wallet: {
        select: { id: true, solde: true, currency: true, statut: true },
      },
      liensBeneficiaire: {
        where: { statut: 'ACTIF' },
        select: {
          entreprise_id: true,
          entreprise: { select: { id: true, nom: true } },
        },
        take: 1,
      },
      entrepriseAdmin: {
        select: {
          entreprise_id: true,
          entreprise: { select: { id: true, nom: true } },
        },
      },
    },
  });
}

async function pinOublie(telephoneRaw) {
  const telephone = normaliserTelephone(telephoneRaw);
  const user = await prisma.user.findUnique({
    where: { telephone },
    select: { id: true, email_perso: true, pin_hash: true },
  });

  if (!user) {
    // Ne pas révéler si le numéro existe ou non
    return { message: 'Si ce numéro est enregistré, un email a été envoyé.' };
  }

  if (!user.email_perso) {
    const err = new Error('Aucun email personnel associé à ce compte. Contactez votre employeur.');
    err.statusCode = 400;
    throw err;
  }

  // Réutiliser le mécanisme OTP existant — le code est valable 5 min
  const code = await creerOtp(prisma, telephone);

  const { html, text } = templates.pinReset(code);
  await envoyerEmail({
    to: user.email_perso,
    subject: 'TIKEXO — Réinitialisation de votre code PIN',
    html,
    text,
    expediteur: 'noreply',
  });

  return { emailMasque: masquerEmail(user.email_perso) };
}

async function loginEmail(emailRaw, motDePasse) {
  const email = emailRaw?.trim()?.toLowerCase();
  if (!email || !motDePasse) {
    const err = new Error('Email et mot de passe requis');
    err.statusCode = 400;
    throw err;
  }

  const user = await prisma.user.findFirst({ where: { email_perso: email } });

  if (!user || !user.mot_de_passe_hash) {
    const err = new Error('Email ou mot de passe incorrect');
    err.statusCode = 401;
    throw err;
  }

  const ok = await bcrypt.compare(motDePasse, user.mot_de_passe_hash);
  if (!ok) {
    await prisma.auditLog.create({
      data: { user_id: user.id, action: 'LOGIN_ECHEC', entite: 'User', entite_id: user.id },
    });
    const err = new Error('Email ou mot de passe incorrect');
    err.statusCode = 401;
    throw err;
  }

  if (user.statut === 'INACTIF') {
    const err = new Error(
      ['ADMIN_RH', 'GESTIONNAIRE_RH'].includes(user.role)
        ? 'Votre compte est en attente de validation KYB. Vous serez notifié par email dès approbation.'
        : "Votre compte est en attente d'activation. Contactez votre employeur ou le support TIKEXO."
    );
    err.statusCode = 403;
    err.code = 'COMPTE_INACTIF';
    throw err;
  }

  if (user.statut === 'BLOQUE' || user.statut === 'SUSPENDU') {
    const err = new Error('Votre compte a été suspendu. Contactez le support TIKEXO.');
    err.statusCode = 403;
    err.code = 'COMPTE_BLOQUE';
    throw err;
  }

  const tokens = genererTokens(user.id, user.role);

  await prisma.auditLog.create({
    data: { user_id: user.id, action: 'CONNEXION_EMAIL', entite: 'User', entite_id: user.id },
  });

  return { ...tokens, user: { id: user.id, role: user.role, nom: user.nom, prenom: user.prenom, email: user.email_perso } };
}

async function changerMotDePasse(userId, ancien, nouveau) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (user.mot_de_passe_hash) {
    const ok = await bcrypt.compare(ancien, user.mot_de_passe_hash);
    if (!ok) {
      const err = new Error('Mot de passe actuel incorrect');
      err.statusCode = 401;
      throw err;
    }
  }

  if (nouveau.length < 8) {
    const err = new Error('Le nouveau mot de passe doit contenir au moins 8 caractères');
    err.statusCode = 400;
    throw err;
  }

  const hash = await bcrypt.hash(nouveau, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { mot_de_passe_hash: hash } });
  await prisma.auditLog.create({
    data: { user_id: userId, action: 'MOT_DE_PASSE_CHANGE', entite: 'User', entite_id: userId },
  });

  return { success: true };
}

async function enregistrerFcmToken(userId, fcmToken) {
  await prisma.user.update({
    where: { id: userId },
    data: { fcm_token: fcmToken },
  });
}

const MSG_OUBLIE = 'Si un compte correspond à cet email, un code de réinitialisation vous a été envoyé.';

async function motDePasseOublie(email) {
  const emailNorm = email?.trim()?.toLowerCase();
  const user = await prisma.user.findFirst({ where: { email_perso: emailNorm } });
  if (!user) return { message: MSG_OUBLIE };

  const code = await creerOtp(prisma, user.telephone);
  const { html, text } = templates.resetMotDePasse(user.prenom, code);
  await envoyerEmail({
    to: emailNorm,
    subject: 'Réinitialisation de votre mot de passe TIKEXO',
    html,
    text,
    expediteur: 'hello',
  });

  return { message: MSG_OUBLIE };
}

async function reinitialiserMotDePasse(email, code, nouveauMotDePasse) {
  const emailNorm = email?.trim()?.toLowerCase();
  const user = await prisma.user.findFirst({ where: { email_perso: emailNorm } });
  if (!user) {
    const err = new Error('Code ou email incorrect'); err.statusCode = 401; throw err;
  }

  const resultat = await verifierOtpUtil(prisma, user.telephone, code);
  if (!resultat.valide) {
    const err = new Error(resultat.motif); err.statusCode = 401; throw err;
  }

  if (!nouveauMotDePasse || nouveauMotDePasse.length < 6) {
    const err = new Error('Mot de passe trop court (6 caractères minimum)'); err.statusCode = 400; throw err;
  }

  const hash = await bcrypt.hash(nouveauMotDePasse, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: user.id }, data: { mot_de_passe_hash: hash } });

  return { message: 'Mot de passe réinitialisé avec succès' };
}

module.exports = { demanderOtp, verifierOtp, refreshToken, definirPin, verifierPin, statutPin, pinOublie, getProfil, loginEmail, changerMotDePasse, enregistrerFcmToken, motDePasseOublie, reinitialiserMotDePasse };
