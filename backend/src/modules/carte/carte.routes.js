const express = require('express');
const router = express.Router();
const ctrl = require('./carte.controller');
const { authentifier, autoriser } = require('../../middlewares/auth');

router.use(authentifier);

router.get('/moi', ctrl.getMaCarte);
router.get('/', autoriser('ADMIN_RH', 'GESTIONNAIRE_RH', 'SUPER_ADMIN', 'ADMIN_OPS'), ctrl.lister);
router.post('/', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.creer);
router.post('/:id/bloquer', autoriser('ADMIN_RH', 'GESTIONNAIRE_RH', 'SUPER_ADMIN', 'ADMIN_OPS'), ctrl.bloquer);
router.post('/:id/debloquer', autoriser('ADMIN_RH', 'GESTIONNAIRE_RH', 'SUPER_ADMIN', 'ADMIN_OPS'), ctrl.debloquer);

module.exports = router;
