// Routes dotation TIKEXO
const express = require('express');
const router = express.Router();
const ctrl = require('./dotation.controller');
const { authentifier, autoriser } = require('../../middlewares/auth');

router.use(authentifier);

router.post('/calculer', autoriser('ADMIN_RH', 'GESTIONNAIRE_RH', 'SUPER_ADMIN', 'ADMIN_OPS'), ctrl.calculer);
router.post('/valider', autoriser('ADMIN_RH', 'GESTIONNAIRE_RH', 'SUPER_ADMIN', 'ADMIN_OPS'), ctrl.valider);
router.post('/distribuer', autoriser('ADMIN_RH', 'GESTIONNAIRE_RH', 'SUPER_ADMIN', 'ADMIN_OPS'), ctrl.distribuer);
router.get('/', ctrl.lister);
router.get('/:id', ctrl.getById);

module.exports = router;
