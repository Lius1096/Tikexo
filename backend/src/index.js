// Point d'entrée TIKEXO Backend
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

const { errorHandler, notFoundHandler, logger } = require('./middlewares/errorHandler');
const { limiterGeneral } = require('./middlewares/rateLimiter');

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

const app = express();
const server = http.createServer(app);

// Socket.io — solde live
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Partager io avec les modules
app.set('io', io);

// HTTPS — forcer en production via header Traefik X-Forwarded-Proto
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Sécurité
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://tikexo.bj',
  ],
  credentials: true,
}));

// Parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
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

// 404
app.use(notFoundHandler);

// Erreurs
app.use(errorHandler);

// Socket.io — authentification et solde temps réel
io.on('connection', (socket) => {
  socket.on('rejoindre_wallet', (walletId) => {
    socket.join(`wallet:${walletId}`);
  });

  socket.on('quitter_wallet', (walletId) => {
    socket.leave(`wallet:${walletId}`);
  });
});

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    logger.info(`TIKEXO API démarrée sur le port ${PORT} (${process.env.NODE_ENV})`);
  });
}

module.exports = { app, server, io };
