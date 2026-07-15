// Routes entreprise TIKEXO
const express = require('express');
const router = express.Router();
const ctrl = require('./entreprise.controller');
const { authentifier, autoriser, estAdmin } = require('../../middlewares/auth');

router.use(authentifier);

router.get('/', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.lister);
router.post('/', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.creer);
router.get('/:id', ctrl.getById);
router.put('/:id', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH'), ctrl.modifier);
router.post('/:id/valider-kyb', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.validerKYB);
router.post('/:id/suspendre', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.suspendre);
router.get('/:id/beneficiaires', ctrl.getBeneficiaires);
router.get('/:id/wallet', ctrl.getWallet);
router.get('/:id/stats', ctrl.getStats);
router.get('/:id/equipe-rh', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.getEquipeRH);
router.post('/:id/users/:userId/toggle-statut', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.toggleStatutUser);

module.exports = router;
