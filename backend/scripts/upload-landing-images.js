/**
 * Script TIKEXO — Upload des images landing vers MinIO
 * Usage : node scripts/upload-landing-images.js
 *
 * Télécharge les images Unsplash + avatars et les stocke dans
 * le bucket MinIO sous le préfixe landing/
 * Puis applique une policy public-read sur ce préfixe.
 */
require('dotenv').config();
const { S3Client, PutObjectCommand, PutBucketPolicyCommand, CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const https = require('https');
const http  = require('http');

const ENDPOINT   = process.env.S3_ENDPOINT   || 'http://127.0.0.1:9000';
const ACCESS_KEY = process.env.S3_ACCESS_KEY  || 'minioadmin';
const SECRET_KEY = process.env.S3_SECRET_KEY  || 'minioadmin';
const BUCKET     = process.env.S3_BUCKET      || 'tikexo-documents';

const client = new S3Client({
  endpoint:        ENDPOINT,
  region:          'us-east-1',
  credentials:     { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  forcePathStyle:  true,
});

// ── Images à uploader ──────────────────────────────────────────────────────
const IMAGES = [
  // Hero slides (pleine largeur)
  { url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&auto=format&fit=crop&q=80', key: 'landing/hero-1.jpg' },
  { url: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1600&auto=format&fit=crop&q=80', key: 'landing/hero-2.jpg' },
  { url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600&auto=format&fit=crop&q=80', key: 'landing/hero-3.jpg' },
  { url: 'https://images.unsplash.com/photo-1567721913486-6585f069b332?w=1600&auto=format&fit=crop&q=80', key: 'landing/hero-4.jpg' },
  // Actor cards (vignettes)
  { url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=200&auto=format&fit=crop&q=80', key: 'landing/actor-1.jpg' },
  { url: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&h=200&auto=format&fit=crop&q=80', key: 'landing/actor-2.jpg' },
  { url: 'https://images.unsplash.com/photo-1567721913486-6585f069b332?w=600&h=200&auto=format&fit=crop&q=80', key: 'landing/actor-3.jpg' },
  // Avatars témoignages
  { url: 'https://i.pravatar.cc/80?img=47', key: 'landing/avatar-1.jpg' },
  { url: 'https://i.pravatar.cc/80?img=57', key: 'landing/avatar-2.jpg' },
  { url: 'https://i.pravatar.cc/80?img=44', key: 'landing/avatar-3.jpg' },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function download(url) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get;
    get(url, { headers: { 'User-Agent': 'TikeXO/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(download(res.headers.location));
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} pour ${url}`));
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/jpeg' }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function upload({ buffer, contentType, key }) {
  await client.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: contentType,
  }));
}

async function setPublicReadPolicy() {
  const policy = {
    Version: '2012-10-17',
    Statement: [{
      Effect:    'Allow',
      Principal: '*',
      Action:    ['s3:GetObject'],
      Resource:  [`arn:aws:s3:::${BUCKET}/landing/*`],
    }],
  };
  await client.send(new PutBucketPolicyCommand({
    Bucket: BUCKET,
    Policy: JSON.stringify(policy),
  }));
  console.log(`✓  Policy public-read appliquée sur ${BUCKET}/landing/*`);
}

async function ensureBucket() {
  try {
    await client.send(new HeadBucketCommand({ Bucket: BUCKET }));
    console.log(`✓  Bucket "${BUCKET}" existant`);
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: BUCKET }));
    console.log(`✓  Bucket "${BUCKET}" créé`);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nTIKEXO — Upload images landing → ${ENDPOINT}/${BUCKET}\n`);
  await ensureBucket();

  for (const img of IMAGES) {
    process.stdout.write(`  Téléchargement ${img.key} ... `);
    try {
      const { buffer, contentType } = await download(img.url);
      await upload({ buffer, contentType, key: img.key });
      console.log(`✓  ${(buffer.length / 1024).toFixed(0)} Ko`);
    } catch (err) {
      console.error(`✗  ${err.message}`);
    }
  }

  await setPublicReadPolicy();

  console.log(`\nURLs publiques :\n`);
  IMAGES.forEach((img) => {
    console.log(`  ${ENDPOINT}/${BUCKET}/${img.key}`);
  });
  console.log('');
}

main().catch((err) => {
  console.error('Erreur fatale :', err.message);
  process.exit(1);
});
