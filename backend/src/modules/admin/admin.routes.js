// Routes admin TIKEXO
const express = require('express');
const router = express.Router();
const ctrl = require('./admin.controller');
const { authentifier, autoriser } = require('../../middlewares/auth');

router.use(authentifier, autoriser('SUPER_ADMIN', 'ADMIN_OPS'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/audit-logs', ctrl.getAuditLogs);
router.get('/utilisateurs', ctrl.getUtilisateurs);
router.post('/utilisateurs/:id/bloquer', ctrl.bloquerUtilisateur);
router.post('/utilisateurs/:id/debloquer', ctrl.debloquerUtilisateur);
router.get('/stats/transactions', ctrl.getStatsTransactions);
router.get('/stats/wallets', ctrl.getStatsWallets);
router.get('/alertes-fraude', ctrl.getAlertesFraude);

module.exports = router;
