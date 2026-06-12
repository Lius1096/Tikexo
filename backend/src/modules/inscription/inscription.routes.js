// Route publique — aucune authentification requise
const express = require('express');
const router = express.Router();
const ctrl = require('./inscription.controller');
const { limiterOtp } = require('../../middlewares/rateLimiter');

router.post('/', limiterOtp, ctrl.inscrire);

module.exports = router;
