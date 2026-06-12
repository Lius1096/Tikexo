// Service d'authentification TIKEXO
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../../config/database');
const { creerOtp, verifierOtp: verifierOtpUtil } = require('../../utils/otp');
const { normaliserTelephone, validerTelephone } = require('../../utils/telephone');

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

  // En prod : envoyer par SMS via API SMS
  // En dev : logger le code
  if (process.env.NODE_ENV !== 'production') {
    console.log(`TIKEXO OTP [DEV] ${telephone}: ${code}`);
  }

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

  if (user.statut === 'INACTIF') {
    await prisma.user.update({
      where: { id: user.id },
      data: { statut: 'ACTIF' },
    });
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

  return { ...tokens, user: { id: user.id, role: user.role, nom: user.nom, prenom: user.prenom } };
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

async function verifierPin(telephoneRaw, pin) {
  const telephone = normaliserTelephone(telephoneRaw);
  const user = await prisma.user.findUnique({ where: { telephone } });

  if (!user || !user.pin_hash) {
    const err = new Error('PIN non configuré — utilisez l\'OTP');
    err.statusCode = 401;
    throw err;
  }

  const correct = await bcrypt.compare(pin, user.pin_hash);

  if (!correct) {
    await prisma.auditLog.create({
      data: {
        user_id: user.id,
        action: 'PIN_ECHEC',
        entite: 'User',
        entite_id: user.id,
      },
    });

    const err = new Error('PIN incorrect');
    err.statusCode = 401;
    throw err;
  }

  const tokens = genererTokens(user.id, user.role);

  await prisma.auditLog.create({
    data: {
      user_id: user.id,
      action: 'CONNEXION_PIN',
      entite: 'User',
      entite_id: user.id,
    },
  });

  return { ...tokens, user: { id: user.id, role: user.role, nom: user.nom, prenom: user.prenom } };
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
    },
  });
}

module.exports = { demanderOtp, verifierOtp, refreshToken, definirPin, verifierPin, getProfil };
