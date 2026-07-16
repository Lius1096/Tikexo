// Routes commerçant TIKEXO
const express = require('express');
const router = express.Router();
const ctrl = require('./commercant.controller');
const { authentifier, autoriser } = require('../../middlewares/auth');

router.use(authentifier);

router.get('/', ctrl.lister);
router.post('/', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.creer);
router.get('/moi', autoriser('COMMERCANT'), ctrl.getMoi);
router.post('/moi/payout', autoriser('COMMERCANT'), ctrl.demanderPayout);
router.get('/proximite', ctrl.parProximite);
router.get('/nearby', ctrl.nearby);             // GET /api/v1/commercants/nearby
router.get('/:id/fiche', ctrl.fiche);           // GET /api/v1/commercants/:id/fiche
router.get('/:id', ctrl.getById);
router.put('/:id', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'COMMERCANT'), ctrl.modifier);
router.post('/:id/valider', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.valider);
router.post('/:id/activer', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.activer);
router.post('/:id/suspendre', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.suspendre);
router.post('/:id/qrcode', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'COMMERCANT'), ctrl.regenererQRCode);

module.exports = router;
