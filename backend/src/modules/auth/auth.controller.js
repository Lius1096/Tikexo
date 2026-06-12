// Contrôleur d'authentification TIKEXO — zéro logique métier
const authService = require('./auth.service');

async function demanderOtp(req, res, next) {
  try {
    const { telephone } = req.body;
    const data = await authService.demanderOtp(telephone);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function verifierOtp(req, res, next) {
  try {
    const { telephone, code } = req.body;
    const data = await authService.verifierOtp(telephone, code);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const data = await authService.refreshToken(refreshToken);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function definirPin(req, res, next) {
  try {
    const { pin } = req.body;
    const data = await authService.definirPin(req.user.id, pin);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function verifierPin(req, res, next) {
  try {
    const { telephone, pin } = req.body;
    const data = await authService.verifierPin(telephone, pin);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    res.json({ success: true, data: { message: 'Déconnexion TIKEXO réussie' } });
  } catch (err) {
    next(err);
  }
}

async function getProfil(req, res, next) {
  try {
    const data = await authService.getProfil(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { demanderOtp, verifierOtp, refreshToken, definirPin, verifierPin, logout, getProfil };
