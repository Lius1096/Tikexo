// Contrôleur transaction TIKEXO — zéro logique métier
const service = require('./transaction.service');

async function creer(req, res, next) {
  try {
    const data = await service.creer(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}
async function lister(req, res, next) {
  try { res.json({ success: true, data: await service.lister(req.user.id, req.user.role, req.query) }); } catch (e) { next(e); }
}
async function getById(req, res, next) {
  try { res.json({ success: true, data: await service.getById(req.params.id) }); } catch (e) { next(e); }
}
async function annuler(req, res, next) {
  try { res.json({ success: true, data: await service.annuler(req.params.id, req.user.id) }); } catch (e) { next(e); }
}

module.exports = { creer, lister, getById, annuler };
