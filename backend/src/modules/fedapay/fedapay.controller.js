// Contrôleur FedaPay TIKEXO — zéro logique métier
const service = require('./fedapay.service');
const prisma = require('../../config/database');
const { webhookQueue, payoutQueue } = require('../../queues/index');

async function creerCollecte(req, res, next) {
  try {
    const { entrepriseId, montant, telephonePayeur } = req.body;
    const data = await service.creerCollecte(prisma, { entrepriseId, montant, telephonePayeur });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// Répond 200 immédiatement à FedaPay — traitement asynchrone en queue
async function traiterWebhook(req, res, next) {
  try {
    const signature = req.headers['x-fedapay-signature'] || '';
    const rawBody   = req.rawBody?.toString('utf8') || '';
    await webhookQueue.add('fedapay-webhook', {
      payload: req.body,
      rawBody,
      signature,
    }, {
      jobId: `webhook-${req.body?.transaction?.id || Date.now()}`, // déduplique les doublons
    });
    res.status(200).json({ success: true, queued: true });
  } catch (e) { next(e); }
}

// Payout manuel → en queue avec priorité normale
async function declencherPayout(req, res, next) {
  try {
    const job = await payoutQueue.add('payout-manuel', {
      commercantId: req.params.commercantId,
    });
    res.json({ success: true, data: { jobId: job.id, statut: 'EN_QUEUE' } });
  } catch (e) { next(e); }
}

async function listerOperations(req, res, next) {
  try {
    const { page = 1, limit = 20, type, statut } = req.query;
    const where = {};
    if (type) where.type = type;
    if (statut) where.statut = statut;

    const [total, items] = await Promise.all([
      prisma.fedapayOperation.count({ where }),
      prisma.fedapayOperation.findMany({
        where,
        include: {
          entreprise: { select: { nom: true } },
          commercant: { select: { nom: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit),
      }),
    ]);

    res.json({ success: true, data: { items, total, page, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
}

module.exports = { creerCollecte, traiterWebhook, declencherPayout, listerOperations };
