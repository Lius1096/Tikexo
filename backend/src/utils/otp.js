// Gestion des OTP TIKEXO — 6 chiffres, bcrypt rounds 12, TTL 5 min
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const OTP_TTL_MINUTES = 5;
const OTP_MAX_TENTATIVES = 3;
const BCRYPT_ROUNDS = 12;

/**
 * Génère un code OTP numérique à 6 chiffres.
 * Utilise crypto.randomInt pour garantir l'imprévisibilité.
 */
function genererOtp() {
  const code = crypto.randomInt(100000, 999999).toString();
  return code;
}

/**
 * Hache un code OTP avec bcrypt (salt différent à chaque appel).
 */
async function hasherOtp(code) {
  return bcrypt.hash(code, BCRYPT_ROUNDS);
}

/**
 * Crée un OTP en base et retourne le code en clair (pour l'envoi SMS).
 */
async function creerOtp(prisma, telephone) {
  const code = genererOtp();
  const codeHash = await hasherOtp(code);
  const expiration = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  // Invalider les anciens OTP non utilisés pour ce numéro
  await prisma.$executeRaw`
    UPDATE "OtpCode"
    SET utilise = true
    WHERE telephone = ${telephone} AND utilise = false AND expiration > NOW()
  `;

  await prisma.otpCode.create({
    data: {
      telephone,
      code_hash: codeHash,
      expiration,
      utilise: false,
      tentatives: 0,
    },
  });

  return code;
}

/**
 * Vérifie un OTP soumis.
 * Retourne { valide: boolean, motif? }
 */
async function verifierOtp(prisma, telephone, codeSoumis) {
  const otpRecord = await prisma.otpCode.findFirst({
    where: {
      telephone,
      utilise: false,
      expiration: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord) {
    return { valide: false, motif: 'Code OTP expiré ou inexistant' };
  }

  if (otpRecord.tentatives >= OTP_MAX_TENTATIVES) {
    return { valide: false, motif: 'Trop de tentatives — demandez un nouveau code' };
  }

  const codeCorrect = await bcrypt.compare(codeSoumis, otpRecord.code_hash);

  if (!codeCorrect) {
    // Incrémenter les tentatives via SQL raw (non bloqué par middleware)
    await prisma.$executeRaw`
      UPDATE "OtpCode"
      SET tentatives = tentatives + 1
      WHERE id = ${otpRecord.id}
    `;
    return { valide: false, motif: 'Code OTP incorrect' };
  }

  // Marquer comme utilisé
  await prisma.$executeRaw`
    UPDATE "OtpCode"
    SET utilise = true
    WHERE id = ${otpRecord.id}
  `;

  return { valide: true };
}

module.exports = {
  genererOtp,
  hasherOtp,
  creerOtp,
  verifierOtp,
  OTP_TTL_MINUTES,
  OTP_MAX_TENTATIVES,
};
