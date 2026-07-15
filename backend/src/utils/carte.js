// Utilitaire cryptographique cartes TIKEXO
// Luhn · CVV HMAC-SHA256 · QR signé · NFC token
const crypto = require('crypto');

const PREFIXE = process.env.CARTE_PREFIXE || '4782';

// ─── Luhn ────────────────────────────────────────────────────────────────────

function validerLuhn(numero) {
  const digits = String(numero).replace(/\D/g, '').split('').map(Number);
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    if (double) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

function _checkDigit(numero15) {
  const digits = (numero15 + '0').split('').map(Number);
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    if (double) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    double = !double;
  }
  return (10 - (sum % 10)) % 10;
}

// ─── Génération numéro ────────────────────────────────────────────────────────

async function genererNumeroCarte(prisma) {
  for (let t = 0; t < 10; t++) {
    let middle = '';
    for (let i = 0; i < 11; i++) middle += crypto.randomInt(0, 10).toString();

    const numero15 = PREFIXE + middle;
    const check    = _checkDigit(numero15);
    const numero16 = numero15 + check;

    if (!validerLuhn(numero16)) continue;

    const hash = crypto.createHash('sha256').update(numero16).digest('hex');
    const existing = await prisma.carteDigi.findUnique({ where: { numero_hash: hash } });
    if (existing) continue;

    const suffixe     = numero16.slice(-4);
    const numeroMasque = `${PREFIXE} •••• •••• ${suffixe}`;
    return { numero16, hash, suffixe, numeroMasque };
  }
  throw new Error('Impossible de générer un numéro unique — relancez');
}

function masquerNumero(numero16) {
  const n = String(numero16).replace(/\D/g, '');
  return `${n.slice(0, 4)} •••• •••• ${n.slice(-4)}`;
}

// ─── CVV dynamique ────────────────────────────────────────────────────────────

function genererCVV(carteId, moisCourant) {
  const secret = process.env.CARTE_CVV_SECRET_KEY;
  if (!secret) throw new Error('CARTE_CVV_SECRET_KEY non configurée');
  const hmac   = crypto.createHmac('sha256', secret).update(`${carteId}:${moisCourant}`).digest('hex');
  const digits = hmac.replace(/[^0-9]/g, '');
  return digits.slice(0, 3).padStart(3, '1');
}

function moisCourant() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Date d'expiration ────────────────────────────────────────────────────────

function genererDateExpiration() {
  // 31 décembre de l'année courante + 1 an (pour avoir au moins 6 mois de validité)
  const annee = new Date().getFullYear() + 1;
  return new Date(annee, 11, 31, 23, 59, 59);
}

// ─── QR Code dynamique ────────────────────────────────────────────────────────

function genererQRCodePayload(walletId, montant = null) {
  const secret = process.env.CARTE_QR_SECRET_KEY;
  if (!secret) throw new Error('CARTE_QR_SECRET_KEY non configurée');

  const payload = {
    wallet_id : walletId,
    timestamp : Date.now(),
    nonce     : crypto.randomBytes(8).toString('hex'),
    montant   : montant ?? null,
    expires_at: Date.now() + 60_000,
  };

  const payloadStr = JSON.stringify(payload);
  const signature  = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

  return { payload, payloadStr, signature };
}

function validerQRCodeSignature(payloadStr, signature) {
  const secret = process.env.CARTE_QR_SECRET_KEY;
  if (!secret) return { valide: false, motif: 'QR_SECRET_KEY manquant' };

  let expectedSig;
  try {
    expectedSig = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
  } catch {
    return { valide: false, motif: 'Erreur signature' };
  }

  if (signature.length !== expectedSig.length) return { valide: false, motif: 'Signature invalide' };

  const sigBuf = Buffer.from(signature,   'hex');
  const expBuf = Buffer.from(expectedSig, 'hex');
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return { valide: false, motif: 'Signature invalide' };

  let payload;
  try { payload = JSON.parse(payloadStr); }
  catch { return { valide: false, motif: 'Payload malformé' }; }

  if (Date.now() > payload.expires_at) return { valide: false, motif: 'QR code expiré' };

  return { valide: true, payload };
}

// ─── NFC Token ────────────────────────────────────────────────────────────────

function genererNFCToken(walletId) {
  const secret = process.env.CARTE_NFC_SECRET_KEY;
  if (!secret) throw new Error('CARTE_NFC_SECRET_KEY non configurée');

  const token = {
    wallet_id   : walletId,
    token_unique: crypto.randomUUID(),
    timestamp   : Date.now(),
    expires_at  : Date.now() + 30_000,
  };

  const tokenStr  = JSON.stringify(token);
  const signature = crypto.createHmac('sha256', secret).update(tokenStr).digest('hex');

  return { token, tokenStr, signature };
}

function validerNFCToken(tokenStr, signature) {
  const secret = process.env.CARTE_NFC_SECRET_KEY;
  if (!secret) return { valide: false, motif: 'NFC_SECRET_KEY manquant' };

  let expectedSig;
  try {
    expectedSig = crypto.createHmac('sha256', secret).update(tokenStr).digest('hex');
  } catch {
    return { valide: false, motif: 'Erreur signature' };
  }

  if (signature.length !== expectedSig.length) return { valide: false, motif: 'Signature invalide' };

  const sigBuf = Buffer.from(signature,   'hex');
  const expBuf = Buffer.from(expectedSig, 'hex');
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return { valide: false, motif: 'Signature NFC invalide' };

  let token;
  try { token = JSON.parse(tokenStr); }
  catch { return { valide: false, motif: 'Token malformé' }; }

  if (Date.now() > token.expires_at) return { valide: false, motif: 'Token NFC expiré' };

  return { valide: true, token };
}

// ─── Code d'activation carte physique ────────────────────────────────────────

function genererCodeActivation() {
  const code = crypto.randomInt(100000, 999999).toString();
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  return { code, hash };
}

function verifierCodeActivation(code, hash) {
  const expected = crypto.createHash('sha256').update(String(code)).digest('hex');
  return expected === hash;
}

module.exports = {
  validerLuhn,
  genererNumeroCarte,
  masquerNumero,
  genererCVV,
  moisCourant,
  genererDateExpiration,
  genererQRCodePayload,
  validerQRCodeSignature,
  genererNFCToken,
  validerNFCToken,
  genererCodeActivation,
  verifierCodeActivation,
};
