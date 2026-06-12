// Routes mutation TIKEXO — accès SUPER_ADMIN et ADMIN_OPS uniquement
const express = require('express');
const router = express.Router();
const ctrl = require('./mutation.controller');
const { authentifier, autoriser } = require('../../middlewares/auth');

router.use(authentifier);
router.use(autoriser('SUPER_ADMIN', 'ADMIN_OPS'));

router.get('/', ctrl.lister);
router.get('/:id', ctrl.getById);
router.post('/:id/traiter', ctrl.traiter);

module.exports = router;
