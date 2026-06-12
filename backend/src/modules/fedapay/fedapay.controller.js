// Contrôleur FedaPay TIKEXO — zéro logique métier
const service = require('./fedapay.service');
const prisma = require('../../config/database');

async function creerCollecte(req, res, next) {
  try {
    const { entrepriseId, montant, telephonePayeur } = req.body;
    const data = await service.creerCollecte(prisma, { entrepriseId, montant, telephonePayeur });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function traiterWebhook(req, res, next) {
  try {
    const signature = req.headers['x-fedapay-signature'] || '';
    const data = await service.traiterWebhook(prisma, { payload: req.body, signature });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function declencherPayout(req, res, next) {
  try {
    const data = await service.declencherPayout(prisma, req.params.commercantId);
    res.json({ success: true, data });
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
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit),
      }),
    ]);

    res.json({ success: true, data: { items, total, page, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
}

module.exports = { creerCollecte, traiterWebhook, declencherPayout, listerOperations };
