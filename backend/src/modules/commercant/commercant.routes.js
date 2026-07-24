// Routes commerçant TIKEXO
const express = require('express');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const ctrl = require('./commercant.controller');
const { authentifier, autoriser } = require('../../middlewares/auth');
const { s3UploadMiddleware } = require('../../config/s3');
const prisma = require('../../config/database');

router.use(authentifier);

// Un COMMERCANT ne peut agir que sur sa propre fiche (:id) — sinon n'importe quel
// commerçant pouvait modifier le statut/la commission/le plafond d'un autre, ou
// régénérer son QR code. SUPER_ADMIN/ADMIN_OPS ne sont pas concernés.
const checkCommercantProprietaire = async (req, res, next) => {
  if (req.user.role !== 'COMMERCANT') return next();
  try {
    const commercant = await prisma.commercant.findUnique({ where: { id: req.params.id }, select: { user_id: true } });
    if (!commercant || commercant.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'TIKEXO — Accès refusé à ce commerçant' });
    }
    next();
  } catch (e) { next(e); }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../uploads/commercant');
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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'application/pdf'].includes(file.mimetype);
    cb(ok ? null : new Error('Format non accepté — JPG, PNG ou PDF uniquement'), ok);
  },
});

router.get('/', ctrl.lister);
router.post('/', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.creer);
router.get('/moi', autoriser('COMMERCANT'), ctrl.getMoi);
router.post('/moi/payout', autoriser('COMMERCANT'), ctrl.demanderPayout);
router.post('/moi/documents', autoriser('COMMERCANT'), upload.single('fichier'), s3UploadMiddleware('commercant'), ctrl.uploaderDocument);
router.get('/proximite', ctrl.parProximite);
router.get('/nearby', ctrl.nearby);             // GET /api/v1/commercants/nearby
router.get('/:id/fiche', ctrl.fiche);           // GET /api/v1/commercants/:id/fiche
router.get('/:id', ctrl.getById);
router.put('/:id', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'COMMERCANT'), checkCommercantProprietaire, ctrl.modifier);
router.get('/:id/documents', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'COMMERCANT'), checkCommercantProprietaire, ctrl.getDocuments);
router.get('/:id/transactions', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'COMMERCANT'), checkCommercantProprietaire, ctrl.getTransactions);
router.get('/:id/payouts', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'COMMERCANT'), checkCommercantProprietaire, ctrl.getPayouts);
router.post('/:id/valider', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.valider);
router.post('/:id/activer', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.activer);
router.post('/:id/suspendre', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.suspendre);
router.post('/:id/qrcode', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'COMMERCANT'), checkCommercantProprietaire, ctrl.regenererQRCode);
router.patch('/documents/:docId/valider', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.validerDocument);
router.patch('/documents/:docId/rejeter', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.rejeterDocument);

module.exports = router;
