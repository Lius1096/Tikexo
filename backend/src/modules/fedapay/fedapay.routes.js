// Routes FedaPay TIKEXO
const express = require('express');
const router = express.Router();
const ctrl = require('./fedapay.controller');
const { authentifier, autoriser } = require('../../middlewares/auth');
const { limiterWebhook } = require('../../middlewares/rateLimiter');

// Webhook FedaPay — pas d'authentification JWT (FedaPay signe avec HMAC)
router.post('/webhook', limiterWebhook, ctrl.traiterWebhook);

router.use(authentifier);

router.post('/collecte', autoriser('ADMIN_RH', 'GESTIONNAIRE_RH', 'SUPER_ADMIN', 'ADMIN_OPS'), ctrl.creerCollecte);
router.post('/payout/:commercantId', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.declencherPayout);
router.get('/operations', autoriser('SUPER_ADMIN', 'ADMIN_OPS'), ctrl.listerOperations);

module.exports = router;
