// Contrôleur d'authentification TIKEXO — zéro logique métier
const authService = require('./auth.service');
const { invaliderCacheUser } = require('../../middlewares/auth');

const isProd = process.env.NODE_ENV === 'production';

const COOKIE_ACCESS = 'tikexo_access';
const COOKIE_REFRESH = 'tikexo_refresh';

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'strict',
  path: '/',
};

function setAuthCookies(res, { accessToken, refreshToken }) {
  const accessMaxAge  = parseInt(process.env.JWT_COOKIE_MAX_AGE  || '900',    10); // 15 min
  const refreshMaxAge = parseInt(process.env.JWT_REFRESH_MAX_AGE || '604800', 10); // 7 j

  res.cookie(COOKIE_ACCESS, accessToken, {
    ...cookieOptions,
    maxAge: accessMaxAge * 1000,
  });

  res.cookie(COOKIE_REFRESH, refreshToken, {
    ...cookieOptions,
    path: '/api/v1/auth/refresh',
    maxAge: refreshMaxAge * 1000,
  });
}

function clearAuthCookies(res) {
  res.clearCookie(COOKIE_ACCESS,  { ...cookieOptions });
  res.clearCookie(COOKIE_REFRESH, { ...cookieOptions, path: '/api/v1/auth/refresh' });
}

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
    const { accessToken, refreshToken, ...rest } = await authService.verifierOtp(telephone, code);
    setAuthCookies(res, { accessToken, refreshToken });
    res.json({ success: true, data: rest });
  } catch (err) {
    next(err);
  }
}

async function refreshToken(req, res, next) {
  try {
    // Lire depuis le cookie dédié ou le body (rétro-compatibilité)
    const token = req.cookies?.[COOKIE_REFRESH] ?? req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, error: 'TIKEXO — Refresh token manquant' });
    }
    const { accessToken, refreshToken: newRefresh } = await authService.refreshToken(token);
    setAuthCookies(res, { accessToken, refreshToken: newRefresh });
    res.json({ success: true, data: { message: 'Tokens renouvelés' } });
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
    const { accessToken, refreshToken, ...rest } = await authService.verifierPin(telephone, pin);
    setAuthCookies(res, { accessToken, refreshToken });
    res.json({ success: true, data: rest });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    // Invalider le cache Redis pour forcer une re-vérification au prochain accès
    if (req.user?.id) {
      await invaliderCacheUser(req.user.id);
    }
    clearAuthCookies(res);
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

async function loginEmail(req, res, next) {
  try {
    const { email, mot_de_passe } = req.body;
    const { accessToken, refreshToken, ...rest } = await authService.loginEmail(email, mot_de_passe);
    setAuthCookies(res, { accessToken, refreshToken });
    res.json({ success: true, data: rest });
  } catch (err) {
    next(err);
  }
}

async function changerMotDePasse(req, res, next) {
  try {
    const { ancien, nouveau } = req.body;
    const data = await authService.changerMotDePasse(req.user.id, ancien, nouveau);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function pinOublie(req, res, next) {
  try {
    const { telephone } = req.body;
    const data = await authService.pinOublie(telephone);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function statutPin(req, res, next) {
  try {
    const { telephone } = req.query;
    const data = await authService.statutPin(telephone);
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { demanderOtp, verifierOtp, refreshToken, definirPin, verifierPin, statutPin, pinOublie, logout, getProfil, loginEmail, changerMotDePasse };
