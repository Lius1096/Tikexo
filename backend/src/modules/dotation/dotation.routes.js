// Routes dotation TIKEXO
const express = require('express');
const router = express.Router();
const ctrl = require('./dotation.controller');
const { authentifier, autoriser } = require('../../middlewares/auth');

router.use(authentifier);

// Un ADMIN_RH/GESTIONNAIRE_RH ne peut calculer des dotations que pour sa propre entreprise.
// SUPER_ADMIN/ADMIN_OPS (backoffice TIKEXO) ne sont pas concernés par cette restriction.
const checkEntrepriseProprietaire = (req, res, next) => {
  if (['ADMIN_RH', 'GESTIONNAIRE_RH'].includes(req.user.role)) {
    if (!req.user.entrepriseId || req.user.entrepriseId !== req.body.entrepriseId) {
      return res.status(403).json({ success: false, error: 'TIKEXO — Accès refusé à cette entreprise' });
    }
  }
  next();
};

router.post('/calculer', autoriser('ADMIN_RH', 'GESTIONNAIRE_RH', 'SUPER_ADMIN', 'ADMIN_OPS'), checkEntrepriseProprietaire, ctrl.calculer);
router.post('/valider', autoriser('ADMIN_RH', 'GESTIONNAIRE_RH', 'SUPER_ADMIN', 'ADMIN_OPS'), ctrl.valider);
router.post('/distribuer', autoriser('ADMIN_RH', 'GESTIONNAIRE_RH', 'SUPER_ADMIN', 'ADMIN_OPS'), ctrl.distribuer);
router.post('/ignorer', autoriser('ADMIN_RH', 'GESTIONNAIRE_RH', 'SUPER_ADMIN', 'ADMIN_OPS'), ctrl.ignorer);
router.get('/', autoriser('ADMIN_RH', 'GESTIONNAIRE_RH', 'SUPER_ADMIN', 'ADMIN_OPS'), ctrl.lister);
router.get('/export/csv', autoriser('ADMIN_RH', 'GESTIONNAIRE_RH', 'SUPER_ADMIN', 'ADMIN_OPS'), ctrl.exportCsv);
router.get('/:id', autoriser('ADMIN_RH', 'GESTIONNAIRE_RH', 'SUPER_ADMIN', 'ADMIN_OPS'), ctrl.getById);

module.exports = router;
