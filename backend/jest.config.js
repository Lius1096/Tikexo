// Configuration Jest TIKEXO — seuils de couverture critiques
const { pathsToModuleNameMapper } = require('ts-jest');

/** @type {import('jest').Config} */
module.exports = {
  testTimeout: 15000,
  testEnvironment: 'node',

  projects: [
    // ── Tests unitaires ──────────────────────────────────────────────────
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/__tests__/unit/**/*.test.js'],
      testEnvironment: 'node',
      setupFiles: ['<rootDir>/src/__tests__/setup.js'],
      testTimeout: 15000,
    },

    // ── Tests d'intégration ──────────────────────────────────────────────
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.js'],
      testEnvironment: 'node',
      setupFiles: ['<rootDir>/src/__tests__/setup.js'],
      testTimeout: 30000,
      // Les tests d'intégration s'exécutent séquentiellement pour éviter les conflits DB
      runInBand: true,
    },

    // ── Tests de sécurité ────────────────────────────────────────────────
    {
      displayName: 'security',
      testMatch: ['<rootDir>/src/__tests__/security/**/*.test.js'],
      testEnvironment: 'node',
      setupFiles: ['<rootDir>/src/__tests__/setup.js'],
      testTimeout: 30000,
      runInBand: true,
    },
  ],

  // ── Couverture de code ───────────────────────────────────────────────────
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/__tests__/**',
    '!src/index.js',         // Point d'entrée, testé via intégration
    '!src/config/logger.js', // Logger winston, testé indirectement
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Seuils globaux
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },

    // ── Fichiers critiques : couverture 100% obligatoire ─────────────────
    './src/utils/ledger.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './src/utils/antiFraude.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './src/utils/kyc.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },

    // ── Géolocalisation ─────────────────────────────────────────────────
    './src/utils/geo.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },

    // ── Middleware de sécurité ───────────────────────────────────────────
    './src/middlewares/auth.js': {
      branches: 90,
      functions: 100,
      lines: 90,
      statements: 90,
    },
    './src/middlewares/rateLimiter.js': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },

    // ── Services critiques ───────────────────────────────────────────────
    './src/modules/fedapay/fedapay.service.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/modules/transaction/transaction.service.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/modules/dotation/dotation.service.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
