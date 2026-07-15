// Client S3 compatible MinIO (dev) et Cloudflare R2 (prod)
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

let _client = null;

function getClient() {
  if (!_client && process.env.S3_ENDPOINT) {
    _client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      },
      forcePathStyle: true,
    });
  }
  return _client;
}

async function uploadBuffer(buffer, key, mimeType) {
  const client = getClient();
  if (!client) {
    const err = new Error('Stockage S3 non configuré — S3_ENDPOINT manquant');
    err.statusCode = 503;
    throw err;
  }
  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));
  // URL publique : S3_PUBLIC_URL si bucket R2 en accès public, sinon endpoint path-style
  const base = process.env.S3_PUBLIC_URL
    || `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`;
  return `${base}/${key}`;
}

// Middleware Express : lit le fichier sauvé par multer diskStorage, l'envoie
// sur S3, supprime la copie locale, et attache req.file.url.
// En dev sans S3_ENDPOINT, construit simplement l'URL locale.
function s3UploadMiddleware(subfolder) {
  return async (req, _res, next) => {
    if (!req.file) return next();
    if (process.env.S3_ENDPOINT) {
      try {
        const fs = require('fs');
        const buffer = fs.readFileSync(req.file.path);
        req.file.url = await uploadBuffer(
          buffer,
          `${subfolder}/${req.file.filename}`,
          req.file.mimetype,
        );
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      } catch (err) {
        return next(err);
      }
    } else {
      req.file.url = `/uploads/${subfolder}/${req.file.filename}`;
    }
    next();
  };
}

module.exports = { uploadBuffer, s3UploadMiddleware };
