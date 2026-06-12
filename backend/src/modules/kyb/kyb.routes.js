// Routes KYB TIKEXO
const express = require('express');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const ctrl = require('./kyb.controller');
const { authentifier, autoriser } = require('../../middlewares/auth');

// Stockage local (dev) — remplacer par Cloudinary en prod
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
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 Mo max
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'application/pdf'].includes(file.mimetype);
    cb(ok ? null : new Error('Format non accepté — JPG, PNG ou PDF uniquement'), ok);
  },
});

router.use(authentifier);

// Routes entreprise
router.get('/dossier', ctrl.getDossier);
router.post('/documents', upload.single('fichier'), ctrl.uploadDocument);

// Routes admin
router.get('/admin/dossiers', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.listerDossiers);
router.get('/admin/dossiers/:entrepriseId', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.getDossierAdmin);
router.patch('/admin/documents/:id/valider', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.validerDocument);
router.patch('/admin/documents/:id/rejeter', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.rejeterDocument);
router.patch('/admin/dossiers/:id/valider-global', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.validerGlobal);

module.exports = router;
