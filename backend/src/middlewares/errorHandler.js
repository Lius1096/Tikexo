// Gestionnaire d'erreurs centralisé TIKEXO
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

/**
 * Gestionnaire d'erreurs Express — retourne toujours { success, error }.
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;

  logger.error('TIKEXO erreur', {
    code: err.code,
    message: err.message,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  // Erreurs métier connues
  if (err.code === 'SOLDE_INSUFFISANT') {
    return res.status(422).json({
      success: false,
      error: 'Solde TIKEXO insuffisant pour cette transaction',
      code: err.code,
    });
  }

  if (err.code === 'WALLET_INACTIF') {
    return res.status(422).json({
      success: false,
      error: 'Wallet TIKEXO inactif ou gelé',
      code: err.code,
    });
  }

  if (err.code === 'IMMUTABLE_RECORD') {
    return res.status(403).json({
      success: false,
      error: 'Opération interdite sur un enregistrement immuable TIKEXO',
      code: err.code,
    });
  }

  if (err.code === 'KYB_NON_VALIDE') {
    return res.status(422).json({
      success: false,
      error: 'KYB entreprise non validé — contactez le support TIKEXO',
      code: err.code,
    });
  }

  // Erreurs Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'Conflit — cet enregistrement existe déjà',
      code: 'DUPLICATE',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Enregistrement introuvable',
      code: 'NOT_FOUND',
    });
  }

  // Erreurs Multer (taille de fichier, etc.) et rejets de fileFilter (format
  // non accepté) — sans ça, ces deux cas tombent dans le générique 500 et
  // perdent le message clair destiné à l'utilisateur.
  if (err.name === 'MulterError') {
    const messages = {
      LIMIT_FILE_SIZE: 'Fichier trop volumineux',
      LIMIT_UNEXPECTED_FILE: 'Fichier inattendu',
    };
    return res.status(400).json({
      success: false,
      error: messages[err.code] || err.message,
      code: err.code,
    });
  }
  if (/Format non accepté/.test(err.message)) {
    return res.status(400).json({
      success: false,
      error: err.message,
      code: 'FORMAT_FICHIER_INVALIDE',
    });
  }

  // Erreurs de validation express-validator
  if (err.type === 'VALIDATION') {
    return res.status(400).json({
      success: false,
      error: 'Données invalides',
      details: err.errors,
    });
  }

  // Erreur générique
  const message = process.env.NODE_ENV === 'production'
    ? 'Erreur interne TIKEXO'
    : err.message;

  return res.status(statusCode).json({
    success: false,
    error: message,
  });
}

/**
 * Route 404 — ressource non trouvée.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `TIKEXO — Route inexistante : ${req.method} ${req.path}`,
  });
}

module.exports = { errorHandler, notFoundHandler, logger };
