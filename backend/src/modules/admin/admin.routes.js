// Routes admin TIKEXO
const express = require('express');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const ctrl = require('./admin.controller');
const { authentifier, autoriser } = require('../../middlewares/auth');
const { s3UploadMiddleware } = require('../../config/s3');

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../uploads/broadcast');
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});
const uploadPieceJointe = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'].includes(file.mimetype);
    cb(ok ? null : new Error('Format non accepté — JPG, PNG, WEBP, GIF ou PDF uniquement'), ok);
  },
});

router.use(authentifier, autoriser('SUPER_ADMIN', 'ADMIN_OPS'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/audit-logs', ctrl.getAuditLogs);
router.get('/utilisateurs', ctrl.getUtilisateurs);
router.post('/utilisateurs/:id/bloquer', ctrl.bloquerUtilisateur);
router.post('/utilisateurs/:id/debloquer', ctrl.debloquerUtilisateur);
// Gestion de l'équipe TIKEXO elle-même — réservée aux SUPER_ADMIN, un
// ADMIN_OPS ne doit pas pouvoir créer un compte ou changer un rôle.
router.post('/admins', autoriser('SUPER_ADMIN'), ctrl.inviterAdminTikexo);
router.patch('/admins/:id/role', autoriser('SUPER_ADMIN'), ctrl.changerRoleAdmin);
router.get('/stats/transactions', ctrl.getStatsTransactions);
router.get('/stats/wallets', ctrl.getStatsWallets);
router.get('/alertes-fraude', ctrl.getAlertesFraude);
router.post('/alertes-fraude/:alerteId/acquitter', ctrl.acquitterAlerteFraude);
router.get('/configuration', ctrl.getConfiguration);
router.put('/configuration', ctrl.majConfiguration);
router.get('/demandes-plafond', ctrl.listerDemandesPlafond);
router.post('/demandes-plafond/:id/traiter', ctrl.traiterDemandePlafond);
router.get('/broadcast', ctrl.getBroadcasts);
router.post('/broadcast', ctrl.envoyerBroadcast);
router.post('/broadcast/upload', uploadPieceJointe.single('piece_jointe'), s3UploadMiddleware('broadcast'), ctrl.uploadPieceJointeBroadcast);
router.get('/email-templates', ctrl.getEmailTemplates);
router.put('/email-templates/:cle', ctrl.majEmailTemplate);
router.delete('/email-templates/:cle', ctrl.reinitialiserEmailTemplate);
router.get('/cgu', ctrl.getCguAdmin);
router.get('/cgu/historique', ctrl.getCguHistorique);
router.post('/cgu', ctrl.publierCgu);

module.exports = router;
