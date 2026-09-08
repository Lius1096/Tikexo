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

module.exports = router;
