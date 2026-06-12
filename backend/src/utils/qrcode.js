// Génération et gestion des QR codes commerçants TIKEXO
const QRCode = require('qrcode');

const cloudinaryDisponible =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

/**
 * Génère un QR code pour un commerçant TIKEXO.
 * En prod : upload Cloudinary. En dev sans config : data URL base64.
 */
async function genererQRCodeCommercant(commercantId, nomCommercant) {
  const payload = JSON.stringify({
    app: 'TIKEXO',
    type: 'PAIEMENT',
    commercant_id: commercantId,
    version: '1',
  });

  const urlData = `tikexo://paiement/${Buffer.from(payload).toString('base64')}`;

  const options = {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    quality: 0.92,
    margin: 2,
    color: { dark: '#1A3C5E', light: '#FFFFFF' },
    width: 512,
  };

  if (cloudinaryDisponible) {
    try {
      const { uploaderImage, DOSSIERS } = require('../config/cloudinary');
      const buffer = await QRCode.toBuffer(urlData, options);
      const publicId = `commercant_${commercantId}_${Date.now()}`;
      const result = await uploaderImage(buffer, DOSSIERS.QR_CODES, publicId);
      return { url: result.secure_url, public_id: result.public_id, payload: urlData };
    } catch (e) {
      console.warn('[QRCode] Cloudinary indisponible, fallback base64 :', e.message);
    }
  }

  // Fallback : data URL base64 (dev sans Cloudinary ou compte désactivé)
  const dataUrl = await QRCode.toDataURL(urlData, options);
  return { url: dataUrl, public_id: null, payload: urlData };
}

/**
 * Décode un QR code TIKEXO.
 */
function decoderQRCode(qrPayload) {
  try {
    const prefix = 'tikexo://paiement/';
    if (!qrPayload.startsWith(prefix)) {
      throw new Error('QR code non reconnu par TIKEXO');
    }

    const encoded = qrPayload.slice(prefix.length);
    const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));

    if (decoded.app !== 'TIKEXO' || decoded.type !== 'PAIEMENT') {
      throw new Error('QR code TIKEXO invalide');
    }

    return decoded;
  } catch {
    throw new Error('QR code invalide ou corrompu');
  }
}

module.exports = { genererQRCodeCommercant, decoderQRCode };
