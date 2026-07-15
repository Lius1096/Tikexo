// Routes bénéficiaire TIKEXO
const express = require('express');
const router = express.Router();
const ctrl = require('./beneficiaire.controller');
const { authentifier, autoriser } = require('../../middlewares/auth');

router.use(authentifier);

router.get('/', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'), ctrl.lister);
router.post('/rechercher-telephone', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'), ctrl.rechercherParTelephone);
router.post('/', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH'), ctrl.creer);
router.get('/:id', ctrl.getById);
router.put('/:id', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH'), ctrl.modifier);
router.post('/:id/rattacher', autoriser('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH'), ctrl.rattacherEntreprise);
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
