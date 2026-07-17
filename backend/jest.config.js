// Configuration Jest TIKEXO — seuils de couverture critiques

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
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
      testTimeout: 15000,
    },

    // ── Tests d'intégration ──────────────────────────────────────────────
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
      testTimeout: 30000,
      // Les tests d'intégration s'exécutent séquentiellement pour éviter les conflits DB
      runInBand: true,
    },

    // ── Tests de sécurité ────────────────────────────────────────────────
    {
      displayName: 'security',
      testMatch: ['<rootDir>/src/__tests__/security/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
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
};
