// Test de charge k6 — rechargements wallet TIKEXO (idempotence FedaPay)
// Exécuter avec : k6 run rechargement-load.js --env BASE_URL=http://localhost:3000
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

export const options = {
  scenarios: {
    employeurs_simultanees: {
      executor: 'per-vu-iterations',
      vus: 20,
      iterations: 10,
      maxDuration: '3m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.05'],
    double_credit_detected: ['count<1'], // Zéro double crédit toléré
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const doubleCredit = new Counter('double_credit_detected');

// Simulation de 20 employeurs distincts
const EMPLOYER_TOKENS = JSON.parse(__ENV.EMPLOYER_TOKENS || '[]');
const WEBHOOK_SECRET = __ENV.WEBHOOK_SECRET || '';

export function setup() {
  // Créer les FedapayOperations de test via l'API interne
  const setupData = { transactionIds: [] };

  for (let i = 0; i < 20; i++) {
    const txId = `load-test-${Date.now()}-${i}`;
    setupData.transactionIds.push(txId);
  }

  return setupData;
}

export default function (data) {
  const vuIndex = __VU - 1;
  const token = EMPLOYER_TOKENS[vuIndex % EMPLOYER_TOKENS.length] || '';
  const txId = data.transactionIds[vuIndex % data.transactionIds.length];

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Simuler un webhook FedaPay approuvé (idempotent)
  const webhookPayload = JSON.stringify({
    transaction: {
      id: txId,
      status: 'approved',
    },
  });

  const res1 = http.post(`${BASE_URL}/api/v1/fedapay/webhook`, webhookPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res1, {
    'Premier webhook → 200': (r) => r.status === 200,
    'Temps < 800ms': (r) => r.timings.duration < 800,
  });

  // Envoyer le même webhook en doublon (test idempotence)
  const res2 = http.post(`${BASE_URL}/api/v1/fedapay/webhook`, webhookPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const doublon = check(res2, {
    'Doublon webhook → 200 (ignoré)': (r) => r.status === 200,
    'Doublon marqué comme tel': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data?.doublon === true;
      } catch {
        return false;
      }
    },
  });

  // Si le doublon n'est pas correctement géré, on incrémente le compteur d'erreur
  if (!doublon) {
    doubleCredit.add(1);
  }

  sleep(0.5);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const errorRate = data.metrics.http_req_failed.values.rate;
  const doubleCreditCount = data.metrics.double_credit_detected?.values?.count || 0;

  console.log(`\n=== RÉSULTAT CHARGE RECHARGEMENTS TIKEXO ===`);
  console.log(`p95 durée : ${p95?.toFixed(2)}ms (seuil: 800ms)`);
  console.log(`Taux erreur : ${(errorRate * 100)?.toFixed(2)}%`);
  console.log(`Doubles crédits détectés : ${doubleCreditCount} (seuil: 0)`);

  const passed = p95 < 800 && doubleCreditCount === 0;
  console.log(`\nRésultat : ${passed ? 'SUCCÈS' : 'ÉCHEC'}`);

  return {
    'rechargement-summary.json': JSON.stringify(data, null, 2),
  };
}
