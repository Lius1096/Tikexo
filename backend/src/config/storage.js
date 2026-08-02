// Stockage objet S3-compatible — MinIO (dev) ou Cloudflare R2 (prod)
// Même code, même SDK — seule l'env var S3_ENDPOINT change
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');

let _client = null;

function getS3Client() {
  if (_client) return _client;

  const endpoint  = process.env.S3_ENDPOINT;
  const accessKey = process.env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_KEY;
  const region    = process.env.S3_REGION || 'auto';

  if (!endpoint || !accessKey || !secretKey) {
    console.warn('[TIKEXO STORAGE] S3 non configuré — stockage objet désactivé');
    return null;
  }

  _client = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,  // requis pour MinIO ; inoffensif sur R2
  });

  return _client;
}

const BUCKET = process.env.S3_BUCKET || 'tikexo-documents';

/**
 * Upload un fichier (Buffer ou Stream) dans le bucket.
 * @returns {{ key: string, url: string }}
 */
async function uploadFichier({ buffer, mimetype, dossier = 'kyb', nomOriginal = 'fichier' }) {
  const client = getS3Client();
  if (!client) throw new Error('Stockage S3 non configuré');

  const ext = path.extname(nomOriginal) || '.bin';
  const key = `${dossier}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

  await client.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: mimetype,
  }));

  return { key, url: `${process.env.S3_ENDPOINT}/${BUCKET}/${key}` };
}

/**
 * Génère une URL pré-signée valide 1 heure pour accéder à un fichier privé.
 */
async function urlPresignee(key, expiresIn = 3600) {
  const client = getS3Client();
  if (!client) throw new Error('Stockage S3 non configuré');

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn }
  );
}

/**
 * Supprime un fichier du bucket.
 */
async function supprimerFichier(key) {
  const client = getS3Client();
  if (!client) return;

  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

const CONTENT_TYPES_PAR_EXTENSION = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
};

function contentTypeDepuisExtension(key) {
  return CONTENT_TYPES_PAR_EXTENSION[path.extname(key).toLowerCase()] || 'application/octet-stream';
}

/**
 * Récupère un objet du bucket en un seul appel S3 (pas de HEAD séparé) —
 * utilisé par le proxy /media. Le content-type est déduit de l'extension.
 * @returns {{ body: import('stream').Readable, contentType: string, contentLength?: number }}
 */
async function obtenirObjetMedia(key) {
  const client = getS3Client();
  if (!client) throw new Error('Stockage S3 non configuré');

  const objet = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));

  return {
    body: objet.Body,
    contentType: contentTypeDepuisExtension(key),
    contentLength: objet.ContentLength,
  };
}

module.exports = { uploadFichier, urlPresignee, supprimerFichier, obtenirObjetMedia };
