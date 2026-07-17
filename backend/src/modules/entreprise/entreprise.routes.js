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

// Un ADMIN_RH/GESTIONNAIRE_RH ne peut agir que sur sa propre entreprise (:id).
// SUPER_ADMIN/ADMIN_OPS (backoffice TIKEXO) ne sont pas concernés par cette restriction.
const checkEntrepriseProprietaire = (req, res, next) => {
  if (['ADMIN_RH', 'GESTIONNAIRE_RH'].includes(req.user.role)) {
    if (!req.user.entrepriseId || req.user.entrepriseId !== req.params.id) {
      return res.status(403).json({ success: false, error: 'TIKEXO — Accès refusé à cette entreprise' });
    }
  }
  next();
};

router.get('/:id/equipe-rh', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'), checkEntrepriseProprietaire, ctrl.getEquipeRH);
router.post('/:id/rh', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH'), checkEntrepriseProprietaire, ctrl.inviterRh);
router.delete('/:id/rh/:userId', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH'), checkEntrepriseProprietaire, ctrl.retirerRh);

router.post('/:id/users/:userId/toggle-statut', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.toggleStatutUser);

module.exports = router;
