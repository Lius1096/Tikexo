// Middlewares KYB TIKEXO
const prisma = require('../config/database');

const RECHARGEMENT_MAX_SANS_KYB = 500000;

async function checkRechargementLimit(req, res, next) {
  try {
    const entrepriseId = req.user?.entrepriseId || req.body?.entrepriseId;
    if (!entrepriseId) return next();

    const entreprise = await prisma.entreprise.findUnique({
      where: { id: entrepriseId },
      select: { kyb_valide: true },
    });

    if (!entreprise || entreprise.kyb_valide) return next();

    const montant = parseFloat(req.body?.montant || 0);
    if (montant > RECHARGEMENT_MAX_SANS_KYB) {
      return res.status(403).json({
        success: false,
        error: 'KYB_REQUIS',
        message: `Rechargements supérieurs à ${RECHARGEMENT_MAX_SANS_KYB.toLocaleString('fr-FR')} XOF nécessitent un KYB validé`,
        redirect: '/employeur/kyb',
        rechargement_max: RECHARGEMENT_MAX_SANS_KYB,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

async function requireKybValide(req, res, next) {
  try {
    const entrepriseId = req.user?.entrepriseId;
    if (!entrepriseId) return next();

    const entreprise = await prisma.entreprise.findUnique({
      where: { id: entrepriseId },
      select: { kyb_valide: true },
    });

    if (!entreprise || !entreprise.kyb_valide) {
      return res.status(403).json({
        success: false,
        error: 'KYB_NON_VALIDE',
        message: 'Fonctionnalité disponible après validation de votre dossier KYB',
        redirect: '/employeur/kyb',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { checkRechargementLimit, requireKybValide };
