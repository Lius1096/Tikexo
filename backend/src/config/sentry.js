// Monitoring des erreurs — Sentry
const Sentry = require('@sentry/node');

function initSentry(app) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn('[TIKEXO SENTRY] SENTRY_DSN non configuré — monitoring désactivé');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: `tikexo-backend@${process.env.npm_package_version || '1.0.0'}`,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration({ app }),
    ],
  });

  console.log('[TIKEXO SENTRY] Monitoring actif');
}

function sentryErrorHandler() {
  return Sentry.expressErrorHandler();
}

module.exports = { initSentry, sentryErrorHandler };
