// Rate limiters TIKEXO
const rateLimit = require('express-rate-limit');

const repondreRateLimit = (req, res) => {
  res.status(429).json({
    success: false,
    error: 'TIKEXO — Trop de requêtes, veuillez patienter',
    retryAfter: res.getHeader('Retry-After'),
  });
};

// Limite générale : 100 req/min par token
const limiterGeneral = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: repondreRateLimit,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// Limite OTP : 10/heure en prod, illimité en dev
const limiterOtp = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: repondreRateLimit,
  keyGenerator: (req) => req.body?.telephone || req.ip,
});

// Limite login : 5/15 min en prod, illimité en dev
const limiterLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: repondreRateLimit,
});

// Limite transactions : 20 req/min par bénéficiaire
const limiterTransaction = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: repondreRateLimit,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// Limite webhooks FedaPay : 200 req/min par IP
const limiterWebhook = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: repondreRateLimit,
});

module.exports = {
  limiterGeneral,
  limiterOtp,
  limiterLogin,
  limiterTransaction,
  limiterWebhook,
};
