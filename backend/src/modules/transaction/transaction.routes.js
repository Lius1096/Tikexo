// Routes transaction TIKEXO
const express = require('express');
const router = express.Router();
const ctrl = require('./transaction.controller');
const { authentifier, autoriser } = require('../../middlewares/auth');
const { limiterTransaction } = require('../../middlewares/rateLimiter');

router.use(authentifier);

router.post('/', autoriser('BENEFICIAIRE'), limiterTransaction, ctrl.creer);
router.get('/', ctrl.lister);
router.get('/export/csv', ctrl.exportCsv);
router.get('/benef-stats', autoriser('ADMIN_RH', 'GESTIONNAIRE_RH', 'SUPER_ADMIN', 'ADMIN_OPS'), ctrl.getStatsBenef);
router.get('/:id', ctrl.getById);
router.post('/:id/annuler', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.annuler);

module.exports = router;
