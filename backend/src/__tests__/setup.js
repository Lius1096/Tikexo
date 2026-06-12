// Configuration Jest TIKEXO
require('dotenv').config({ path: '.env.test' });

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_TEST_URL || 'postgresql://tikexo:tikexo_test@localhost:5432/tikexo_test';
process.env.JWT_SECRET = 'tikexo-test-secret-jwt';
process.env.JWT_REFRESH_SECRET = 'tikexo-test-refresh-secret';
process.env.FEDAPAY_ENV = 'sandbox';
process.env.FEDAPAY_WEBHOOK_SECRET = 'tikexo-test-webhook-secret';
process.env.PORT = '3099';

// Nettoyer les mocks après chaque test
afterEach(() => {
  jest.clearAllMocks();
});
