const express = require('express');
const router = express.Router();
const ctrl = require('./notification.controller');
const { authentifier } = require('../../middlewares/auth');

router.use(authentifier);

// Liste paginée des notifications de l'utilisateur connecté (+ compte non lues)
router.get('/', ctrl.lister);

// Badge cloche — comptage léger, appelé plus fréquemment que la liste complète
router.get('/non-lues/compte', ctrl.compterNonLues);

router.post('/:id/lu', ctrl.marquerLu);
router.post('/lu-tout', ctrl.marquerToutLu);

module.exports = router;
