// Routes support TIKEXO
const express = require('express');
const router = express.Router();
const ctrl = require('./support.controller');
const { authentifier, autoriser } = require('../../middlewares/auth');

router.use(authentifier);

router.post('/tickets', ctrl.creerTicket);
router.get('/tickets/mes', ctrl.getMesTickets);
router.get('/tickets/admin', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.getTicketsAdmin);
// Propriété vérifiée dans le service (admin OU auteur du ticket).
router.get('/tickets/:id', ctrl.getTicket);
router.post('/tickets/:id/messages', ctrl.ajouterMessage);
router.patch('/tickets/:id/statut', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.changerStatut);

module.exports = router;
