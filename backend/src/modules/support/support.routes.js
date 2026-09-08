// Routes support TIKEXO
const express = require('express');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const ctrl = require('./support.controller');
const { authentifier, autoriser } = require('../../middlewares/auth');
const { s3UploadMiddleware } = require('../../config/s3');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../uploads/support');
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
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'].includes(file.mimetype);
    cb(ok ? null : new Error('Format non accepté — JPG, PNG, WEBP, GIF ou PDF uniquement'), ok);
  },
});

router.use(authentifier);

router.post('/tickets', upload.single('piece_jointe'), s3UploadMiddleware('support'), ctrl.creerTicket);
router.get('/tickets/mes', ctrl.getMesTickets);
router.get('/tickets/admin', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.getTicketsAdmin);
// Propriété vérifiée dans le service (admin OU auteur du ticket).
router.get('/tickets/:id', ctrl.getTicket);
router.post('/tickets/:id/messages', upload.single('piece_jointe'), s3UploadMiddleware('support'), ctrl.ajouterMessage);
router.get('/messages/:messageId/fichier', ctrl.getFichierMessage);
router.patch('/tickets/:id/statut', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.changerStatut);

module.exports = router;
