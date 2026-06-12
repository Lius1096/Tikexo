// Middleware d'authentification JWT — TIKEXO
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

const ROLES_ADMIN = ['SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'];

/**
 * Vérifie le token JWT et attache l'utilisateur à req.user.
 */
async function authentifier(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'TIKEXO — Token d\'authentification requis',
    });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
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

    if (!user) {
      return res.status(401).json({ success: false, error: 'TIKEXO — Utilisateur introuvable' });
    }

    if (user.statut === 'BLOQUE' || user.statut === 'ARCHIVE') {
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
 * Empêche un Admin RH d'entreprise A d'accéder aux données de B.
 */
async function verifierEntreprise(req, res, next) {
  const { entrepriseId } = req.params;
  if (!entrepriseId) return next();

  if (['SUPER_ADMIN', 'ADMIN_OPS'].includes(req.user.role)) {
    return next();
  }

  // RH roles: vérifie via EntrepriseAdmin
  if (['ADMIN_RH', 'GESTIONNAIRE_RH'].includes(req.user.role)) {
    const admin = await prisma.entrepriseAdmin.findFirst({
      where: { user_id: req.user.id, entreprise_id: entrepriseId },
    });
    if (!admin) {
      return res.status(403).json({ success: false, error: 'TIKEXO — Accès refusé à cette entreprise' });
    }
    return next();
  }

  // Bénéficiaires: vérifie via lienEntrepriseBeneficiaire
  const lien = await prisma.lienEntrepriseBeneficiaire.findFirst({
    where: { user_id: req.user.id, entreprise_id: entrepriseId, statut: 'ACTIF' },
  });

  if (!lien) {
    return res.status(403).json({ success: false, error: 'TIKEXO — Accès refusé à cette entreprise' });
  }

  next();
}

module.exports = { authentifier, autoriser, estAdmin, verifierEntreprise, ROLES_ADMIN };
