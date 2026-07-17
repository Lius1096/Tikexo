// Routes authentification TIKEXO — OTP par SMS
const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { limiterOtp, limiterLogin, limiterProfil } = require('../../middlewares/rateLimiter');
const { authentifier } = require('../../middlewares/auth');

// Login email + mot de passe (nouveau flux principal)
router.post('/login', limiterLogin, authController.loginEmail);

// Changer le mot de passe (authentifié)
router.post('/mot-de-passe', authentifier, authController.changerMotDePasse);

// Demander un OTP (flux SMS — conservé pour les paiements / reset)
router.post('/otp/demander', limiterOtp, authController.demanderOtp);

// Vérifier un OTP et obtenir un token JWT
router.post('/otp/verifier', limiterLogin, authController.verifierOtp);

// Rafraîchir le token JWT
router.post('/refresh', authController.refreshToken);

// Définir / modifier le PIN
router.post('/pin', authentifier, authController.definirPin);

// Vérifier le PIN (connexion PIN)
router.post('/pin/verifier', limiterLogin, authController.verifierPin);

// Vérifier si un numéro a un PIN actif (pour la page login)
router.get('/pin/statut', authController.statutPin);

// PIN oublié — envoie un code à l'email personnel
router.post('/pin/oublie', limiterOtp, authController.pinOublie);

// Mot de passe oublié — envoie un OTP à l'email
router.post('/mot-de-passe/oublie', limiterOtp, authController.motDePasseOublie);
// Réinitialiser le mot de passe avec l'OTP reçu
router.post('/mot-de-passe/reinitialiser', limiterLogin, authController.reinitialiserMotDePasse);

// Se déconnecter
router.post('/logout', authentifier, authController.logout);

// Récupérer son profil — limiter dédié, appelé à chaque chargement de page
router.get('/profil', limiterProfil, authentifier, authController.getProfil);

// Enregistrer le token Firebase Cloud Messaging pour les push notifications
router.post('/fcm-token', authentifier, authController.enregistrerFcmToken);

// Invitation bénéficiaire — routes publiques (pas d'authentification)
router.get('/invitation/:token', authController.validerInvitation);
router.post('/invitation/complete', authController.completerInvitation);

module.exports = router;
