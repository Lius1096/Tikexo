// Routes inscription — publiques (aucune authentification requise)
const express = require('express');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const ctrl = require('./inscription.controller');
const { limiterOtp } = require('../../middlewares/rateLimiter');
const { s3UploadMiddleware } = require('../../config/s3');

// Multer réutilisé pour les docs KYB à l'inscription
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../uploads/kyb');
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'application/pdf'].includes(file.mimetype);
    cb(ok ? null : new Error('Format non accepté — JPG, PNG ou PDF uniquement'), ok);
  },
});

router.post('/', limiterOtp, ctrl.inscrire);
router.post('/commercant', limiterOtp, ctrl.inscrireCommercant);
router.post('/documents', upload.single('fichier'), s3UploadMiddleware('kyb'), ctrl.uploadDocumentInscription);

module.exports = router;
