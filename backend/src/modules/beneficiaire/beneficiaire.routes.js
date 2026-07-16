// Routes bénéficiaire TIKEXO
const express = require('express');
const router = express.Router();
const ctrl = require('./beneficiaire.controller');
const { authentifier, autoriser } = require('../../middlewares/auth');

router.use(authentifier);

router.get('/', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'), ctrl.lister);
router.post('/rechercher-telephone', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'), ctrl.rechercherParTelephone);
router.post('/import-bulk', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH'), ctrl.importerEnMasse);
router.post('/', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH'), ctrl.creer);
router.get('/:id', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'), ctrl.getById);
router.put('/:id', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH'), ctrl.modifier);
router.post('/:id/rattacher', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH'), ctrl.rattacherEntreprise);
const checkEntrepriseRH = (req, res, next) => {
  if (['ADMIN_RH', 'GESTIONNAIRE_RH'].includes(req.user.role)) {
    const { entrepriseId } = req.body;
    if (!req.user.entrepriseId || req.user.entrepriseId !== entrepriseId)
      return res.status(403).json({ success: false, error: 'TIKEXO — Accès refusé à cette entreprise' });
  }
  next();
};

router.post('/:id/suspendre',  autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'), checkEntrepriseRH, ctrl.suspendre);
router.post('/:id/reactiver', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'), checkEntrepriseRH, ctrl.reactiver);

router.post(
  '/:id/sortie',
  autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'),
  (req, res, next) => {
    // ADMIN_RH / GESTIONNAIRE_RH : must belong to the target enterprise
    if (['ADMIN_RH', 'GESTIONNAIRE_RH'].includes(req.user.role)) {
      const { entrepriseId } = req.body;
      if (!req.user.entrepriseId || req.user.entrepriseId !== entrepriseId) {
        return res.status(403).json({ success: false, error: 'TIKEXO — Accès refusé à cette entreprise' });
      }
    }
    next();
  },
  ctrl.traiterSortie
);

module.exports = router;
