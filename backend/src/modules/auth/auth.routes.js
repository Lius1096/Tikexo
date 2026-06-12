// Routes authentification TIKEXO — OTP par SMS
const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { limiterOtp, limiterLogin } = require('../../middlewares/rateLimiter');
const { authentifier } = require('../../middlewares/auth');

// Demander un OTP
router.post('/otp/demander', limiterOtp, authController.demanderOtp);

// Vérifier un OTP et obtenir un token JWT
router.post('/otp/verifier', limiterLogin, authController.verifierOtp);

// Rafraîchir le token JWT
router.post('/refresh', authController.refreshToken);

// Définir / modifier le PIN
router.post('/pin', authentifier, authController.definirPin);

// Vérifier le PIN (connexion PIN)
router.post('/pin/verifier', limiterLogin, authController.verifierPin);

// Se déconnecter
router.post('/logout', authentifier, authController.logout);

// Récupérer son profil
router.get('/profil', authentifier, authController.getProfil);

module.exports = router;
