// Middlewares KYB TIKEXO
const prisma = require('../config/database');

// Tout rechargement de wallet est bloqué tant que le KYB n'est pas validé par l'admin
async function checkRechargementLimit(req, res, next) {
  try {
    const entrepriseId = req.user?.entrepriseId || req.body?.entrepriseId;
    if (!entrepriseId) return next();

    const entreprise = await prisma.entreprise.findUnique({
      where: { id: entrepriseId },
      select: { kyb_valide: true },
    });

    if (!entreprise || entreprise.kyb_valide) return next();

    return res.status(403).json({
      success: false,
      error: 'KYB_REQUIS',
      message: 'Votre dossier KYB doit être validé par un administrateur TIKEXO avant de pouvoir recharger le wallet',
      redirect: '/employeur/kyb',
    });
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
