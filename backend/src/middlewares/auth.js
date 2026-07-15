// Middleware d'authentification JWT — TIKEXO
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { redisConnection } = require('../queues/redis');

const ROLES_ADMIN = ['SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'];
const USER_CACHE_TTL = 300; // 5 minutes

async function getUserCached(userId) {
  const cacheKey = `auth:user:${userId}`;

  const cached = await redisConnection.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      telephone: true,
      nom: true,
      prenom: true,
      role: true,
      statut: true,
      kyc_niveau: true,
      kyc_via_entreprise: true,
      langue: true,
      liensBeneficiaire: {
        where: { statut: 'ACTIF' },
        select: { entreprise_id: true },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
      entrepriseAdmin: {
        select: { entreprise_id: true },
      },
    },
  });

  if (user) {
    await redisConnection.setex(cacheKey, USER_CACHE_TTL, JSON.stringify(user));
  }

  return user;
}

async function invaliderCacheUser(userId) {
  await redisConnection.del(`auth:user:${userId}`);
}

/**
 * Vérifie le token JWT et attache l'utilisateur à req.user.
 * Accepte : cookie `tikexo_access` (priorité) OU header `Authorization: Bearer`.
 */
async function authentifier(req, res, next) {
  // Cookie HttpOnly en priorité, sinon header Bearer (rétro-compatibilité Postman/mobile)
  const token = req.cookies?.tikexo_access
    ?? (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

  if (!token) {
    res.set('Cache-Control', 'no-store');
    return res.status(401).json({
      success: false,
      error: 'TIKEXO — Token d\'authentification requis',
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await getUserCached(payload.userId);

    if (!user) {
      res.set('Cache-Control', 'no-store');
      return res.status(401).json({ success: false, error: 'TIKEXO — Utilisateur introuvable' });
    }

    if (user.statut === 'BLOQUE' || user.statut === 'ARCHIVE') {
      // Invalider le cache si statut bloqué détecté
      await invaliderCacheUser(payload.userId);
      res.set('Cache-Control', 'no-store');
      return res.status(401).json({
        success: false,
        error: `TIKEXO — Compte ${user.statut.toLowerCase()}`,
      });
    }

    const { liensBeneficiaire, entrepriseAdmin, ...userBase } = user;
    req.user = {
      ...userBase,
      entrepriseId: entrepriseAdmin?.entreprise_id ?? liensBeneficiaire?.[0]?.entreprise_id ?? null,
    };
    next();
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'TIKEXO — Token expiré' });
    }
    return res.status(401).json({ success: false, error: 'TIKEXO — Token invalide' });
  }
}

/**
 * Restreint l'accès aux rôles spécifiés.
 */
function autoriser(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'TIKEXO — Non authentifié' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `TIKEXO — Accès refusé pour le rôle ${req.user.role}`,
      });
    }

    next();
  };
}

/**
 * Vérifie que l'utilisateur est un admin TIKEXO.
 */
function estAdmin(req, res, next) {
  return autoriser(...ROLES_ADMIN)(req, res, next);
}

/**
 * Vérifie que l'utilisateur appartient à une entreprise spécifique.
 */
async function verifierEntreprise(req, res, next) {
  const { entrepriseId } = req.params;
  if (!entrepriseId) return next();

  if (['SUPER_ADMIN', 'ADMIN_OPS'].includes(req.user.role)) {
    return next();
  }

  if (['ADMIN_RH', 'GESTIONNAIRE_RH'].includes(req.user.role)) {
    const admin = await prisma.entrepriseAdmin.findFirst({
      where: { user_id: req.user.id, entreprise_id: entrepriseId },
    });
    if (!admin) {
      return res.status(403).json({ success: false, error: 'TIKEXO — Accès refusé à cette entreprise' });
    }
    return next();
  }

  const lien = await prisma.lienEntrepriseBeneficiaire.findFirst({
    where: { user_id: req.user.id, entreprise_id: entrepriseId, statut: 'ACTIF' },
  });

  if (!lien) {
    return res.status(403).json({ success: false, error: 'TIKEXO — Accès refusé à cette entreprise' });
  }

  next();
}

module.exports = { authentifier, autoriser, estAdmin, verifierEntreprise, invaliderCacheUser, ROLES_ADMIN };
