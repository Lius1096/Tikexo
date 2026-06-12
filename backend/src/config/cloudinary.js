// Configuration Cloudinary — TIKEXO
// Utilisé pour : photos commerçants, documents KYB, QR codes
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const DOSSIERS = {
  COMMERCANTS: 'tikexo/commercants',
  KYB: 'tikexo/kyb',
  QR_CODES: 'tikexo/qr-codes',
};

async function uploaderImage(buffer, dossier, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: dossier, public_id: publicId, resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function supprimerImage(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

module.exports = { cloudinary, DOSSIERS, uploaderImage, supprimerImage };
