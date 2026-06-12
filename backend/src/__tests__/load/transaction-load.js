// Test de charge k6 — transactions TIKEXO
// Exécuter avec : k6 run transaction-load.js --env BASE_URL=http://localhost:3000
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

export const options = {
  scenarios: {
    transactions_concurrent: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 100 }, // Montée en charge
        { duration: '90s', target: 100 }, // Charge soutenue
        { duration: '10s', target: 0 },   // Descente
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    transaction_errors: ['count<10'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const transactionErrors = new Counter('transaction_errors');
const transactionDuration = new Trend('transaction_duration', true);

// Tokens de test pré-générés pour les VUs
const TEST_TOKEN = __ENV.TEST_TOKEN || '';
const TEST_COMMERCANT_ID = __ENV.COMMERCANT_ID || '';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TEST_TOKEN}`,
  };

  // Tentative de transaction
  const txPayload = JSON.stringify({
    commercantId: TEST_COMMERCANT_ID,
    montantTotal: 1500,
  });

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/v1/transactions`, txPayload, { headers });
  transactionDuration.add(Date.now() - startTime);

  const success = check(res, {
    'Transaction répond en < 500ms': (r) => r.timings.duration < 500,
    'Pas d\'erreur 500': (r) => r.status !== 500,
    'Réponse JSON valide': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });

  if (!success || res.status >= 500) {
    transactionErrors.add(1);
  }

  sleep(0.1); // 100ms entre les requêtes par VU
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const p99 = data.metrics.http_req_duration.values['p(99)'];
  const errorRate = data.metrics.http_req_failed.values.rate;

  console.log(`\n=== RÉSULTAT CHARGE TRANSACTIONS TIKEXO ===`);
  console.log(`p95 durée : ${p95?.toFixed(2)}ms (seuil: 500ms)`);
  console.log(`p99 durée : ${p99?.toFixed(2)}ms (seuil: 1000ms)`);
  console.log(`Taux erreur : ${(errorRate * 100)?.toFixed(2)}% (seuil: 1%)`);

  const passed = p95 < 500 && p99 < 1000 && errorRate < 0.01;
  console.log(`\nRésultat : ${passed ? 'SUCCÈS' : 'ÉCHEC'}`);

  return {
    'summary.json': JSON.stringify(data, null, 2),
  };
}
