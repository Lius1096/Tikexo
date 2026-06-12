// Routes wallet TIKEXO
const express = require('express');
const router = express.Router();
const ctrl = require('./wallet.controller');
const { authentifier, autoriser } = require('../../middlewares/auth');
const { checkRechargementLimit } = require('../../middlewares/kyb');

router.use(authentifier);

router.get('/solde', ctrl.getSolde);
router.get('/solde/segmente', ctrl.getSoldeSegmente);
router.get('/historique', ctrl.getHistorique);
router.post('/recharger', autoriser('ADMIN_RH', 'GESTIONNAIRE_RH', 'SUPER_ADMIN', 'ADMIN_OPS'), checkRechargementLimit, ctrl.recharger);
router.post('/:walletId/geler', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.geler);
router.post('/:walletId/degeler', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.degeler);

module.exports = router;
