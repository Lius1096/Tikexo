// Routes entreprise TIKEXO
const express = require('express');
const router = express.Router();
const ctrl = require('./entreprise.controller');
const { authentifier, autoriser, estAdmin } = require('../../middlewares/auth');

router.use(authentifier);

router.get('/', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.lister);
router.post('/', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.creer);
router.get('/:id', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'), ctrl.getById);
router.put('/:id', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH'), ctrl.modifier);
router.post('/:id/valider-kyb', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.validerKYB);
router.post('/:id/suspendre', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.suspendre);
router.get('/:id/beneficiaires', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'), ctrl.getBeneficiaires);
router.get('/:id/wallet', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'), ctrl.getWallet);
router.get('/:id/stats', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'), ctrl.getStats);
router.get('/:id/facturation', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'), ctrl.getFacturation);
router.get('/:id/equipe-rh', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.getEquipeRH);
router.post('/:id/users/:userId/toggle-statut', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.toggleStatutUser);

module.exports = router;
