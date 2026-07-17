// Point d'entrée TIKEXO Backend
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), override: true });
const { initSentry, sentryErrorHandler } = require('./config/sentry');

// Filet de sécurité global
process.on('unhandledRejection', (reason) => {
  console.error('[TIKEXO] unhandledRejection — non fatale', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[TIKEXO] uncaughtException — arrêt propre', err);
  process.exit(1);
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const { errorHandler, notFoundHandler, logger } = require('./middlewares/errorHandler');
const { limiterGeneral } = require('./middlewares/rateLimiter');
const { registerServer } = require('./queues/shutdown');

// Modules
const authRoutes = require('./modules/auth/auth.routes');
const entrepriseRoutes = require('./modules/entreprise/entreprise.routes');
const beneficiaireRoutes = require('./modules/beneficiaire/beneficiaire.routes');
const commercantRoutes = require('./modules/commercant/commercant.routes');
const walletRoutes = require('./modules/wallet/wallet.routes');
const transactionRoutes = require('./modules/transaction/transaction.routes');
const dotationRoutes = require('./modules/dotation/dotation.routes');
const fedapayRoutes = require('./modules/fedapay/fedapay.routes');
const mutationRoutes = require('./modules/mutation/mutation.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const carteRoutes = require('./modules/carte/carte.routes');
const inscriptionRoutes = require('./modules/inscription/inscription.routes');
const kybRoutes = require('./modules/kyb/kyb.routes');
const landingRoutes = require('./modules/landing/landing.routes');

const app = express();
const server = http.createServer(app);

// Monitoring Sentry — doit être init avant les routes
initSentry(app);

// Enregistrer pour le graceful shutdown
registerServer(server);

// Origines autorisées — FRONTEND_URL peut être une liste séparée par des virgules
const allowedOrigins = [
  ...(process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((u) => u.trim())
    : ['http://localhost:5173']),
  'https://tikexo.bj',
];

// Socket.io — solde live
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);
require('./config/socket').setIo(io);

// HTTPS — forcer en production via header Render / Traefik X-Forwarded-Proto
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.path === '/health') return next(); // health check Render sans TLS
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Sécurité
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS non autorisé'));
  },
  credentials: true,
}));

// Cookies
app.use(cookieParser());

// Parsing
app.use(compression());
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting global
app.use('/api/', limiterGeneral);

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, service: 'TIKEXO API', version: '1.0.0', timestamp: new Date() });
});

// Routes API
app.use('/api/v1/inscription', inscriptionRoutes);
app.use('/api/v1/kyb', kybRoutes);
app.use('/uploads/kyb', express.static(require('path').join(__dirname, '../uploads/kyb')));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/entreprises', entrepriseRoutes);
app.use('/api/v1/beneficiaires', beneficiaireRoutes);
app.use('/api/v1/commercants', commercantRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/dotations', dotationRoutes);
app.use('/api/v1/fedapay', fedapayRoutes);
app.use('/api/v1/mutations', mutationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/cartes', carteRoutes);
app.use('/api/v1/landing', landingRoutes);
app.use('/uploads/landing', express.static(require('path').join(__dirname, '../uploads/landing')));

// 404
app.use(notFoundHandler);

// Erreurs — Sentry doit être avant le handler custom
app.use(sentryErrorHandler());
app.use(errorHandler);

// Socket.io — authentification JWT + ownership wallet
io.use((socket, next) => {
  // Cookie HttpOnly en priorité, sinon handshake.auth.token (mobile/Postman)
  const token = socket.handshake.headers.cookie
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('tikexo_access='))
    ?.slice('tikexo_access='.length)
    ?? socket.handshake.auth?.token;

  if (!token) return next(new Error('TIKEXO — Socket non authentifié'));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.userId;
    socket.userRole = payload.role;
    next();
  } catch {
    next(new Error('TIKEXO — Token Socket invalide'));
  }
});

io.on('connection', (socket) => {
  socket.on('rejoindre_wallet', async (walletId) => {
    try {
      const prisma = require('./config/database');
      const wallet = await prisma.wallet.findUnique({
        where: { id: walletId },
        select: { user_id: true, entreprise_id: true },
      });

      if (!wallet) return socket.emit('erreur', { code: 'WALLET_INTROUVABLE' });

      const estProprietaire = wallet.user_id === socket.userId;
      const estAdmin = ['SUPER_ADMIN', 'ADMIN_OPS'].includes(socket.userRole);

      if (!estProprietaire && !estAdmin) {
        return socket.emit('erreur', { code: 'WALLET_ACCES_REFUSE' });
      }

      socket.join(`wallet:${walletId}`);
    } catch {
      socket.emit('erreur', { code: 'ERREUR_SERVEUR' });
    }
  });

  socket.on('quitter_wallet', (walletId) => {
    socket.leave(`wallet:${walletId}`);
  });
});

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  server.listen(PORT, () => {
    logger.info(`TIKEXO API démarrée sur le port ${PORT} (${process.env.NODE_ENV})`);

    const { startWorkers } = require('./queues/startWorkers');
    startWorkers();
  });
}

module.exports = { app, server, io };
