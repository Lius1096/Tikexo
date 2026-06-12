// Configuration FedaPay — TIKEXO
// FedaPay est appelé UNIQUEMENT pour : collecte entreprise, payout commerçant, remboursement salarié
const FedaPay = require('fedapay');

const env = process.env.FEDAPAY_ENV || 'sandbox';
const secretKey = process.env.FEDAPAY_SECRET_KEY;

if (!secretKey) {
  console.warn('TIKEXO AVERTISSEMENT — FEDAPAY_SECRET_KEY non définie');
}

FedaPay.FedaPay.setApiKey(secretKey);
FedaPay.FedaPay.setEnvironment(env);

module.exports = {
  FedaPay,
  FEDAPAY_ENV: env,
  FEDAPAY_WEBHOOK_SECRET: process.env.FEDAPAY_WEBHOOK_SECRET,
};
