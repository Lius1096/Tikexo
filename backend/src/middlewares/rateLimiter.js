// Rate limiters TIKEXO
const rateLimit = require('express-rate-limit');

// Chaque limiteur a sa propre fenêtre : le message doit annoncer le bon délai,
// sinon l'utilisateur attend le mauvais temps avant de réessayer.
const creerHandler = (message) => (req, res) => {
  res.status(429).json({
    success: false,
    error: message,
    retryAfter: res.getHeader('Retry-After'),
  });
};

// Clé réelle : X-Forwarded-For (derrière Traefik/proxy) ou IP directe
function realIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return forwarded ? forwarded.split(',')[0].trim() : req.ip;
}

// Limite générale : 300 req/min par IP réelle
// Relâchée uniquement en développement local (confort) — appliquée en test pour
// que la suite de sécurité puisse vérifier que la limite fonctionne réellement.
// /auth/profil est exempté — appelé à chaque chargement de page (vérif session)
const limiterGeneral = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 5000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: creerHandler('TIKEXO — Trop de requêtes. Veuillez patienter quelques instants avant de réessayer.'),
  keyGenerator: realIp,
  skip: (req) => req.path === '/v1/auth/profil',
});

// Limite profil : vérification de session — 600 req/min par IP (10/sec)
const limiterProfil = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 600 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: creerHandler('TIKEXO — Trop de vérifications de session. Veuillez réessayer dans une minute.'),
  keyGenerator: realIp,
});

// Limite OTP : 10/heure — relâchée uniquement en développement local
const limiterOtp = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: creerHandler('TIKEXO — Trop de demandes de code. Veuillez réessayer dans 1 heure.'),
  keyGenerator: (req) => req.body?.telephone || realIp(req),
});

// Limite login : 5/15 min en prod, illimité en dev
const limiterLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: creerHandler('TIKEXO — Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.'),
  keyGenerator: realIp,
});

// Limite transactions : 20 req/min par bénéficiaire
const limiterTransaction = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: creerHandler('TIKEXO — Trop de transactions. Veuillez réessayer dans une minute.'),
  keyGenerator: (req) => req.user?.id || realIp(req),
});

// Limite webhooks FedaPay : 200 req/min par IP
const limiterWebhook = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: creerHandler('TIKEXO — Trop de requêtes webhook. Veuillez réessayer dans une minute.'),
  keyGenerator: realIp,
});

module.exports = {
  limiterGeneral,
  limiterProfil,
  limiterOtp,
  limiterLogin,
  limiterTransaction,
  limiterWebhook,
};
