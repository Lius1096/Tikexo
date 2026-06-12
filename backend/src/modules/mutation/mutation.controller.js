// Contrôleur mutation TIKEXO — zéro logique métier
const service = require('./mutation.service');

async function lister(req, res, next) {
  try { res.json({ success: true, data: await service.lister(req.query) }); } catch (e) { next(e); }
}
async function getById(req, res, next) {
  try { res.json({ success: true, data: await service.getById(req.params.id) }); } catch (e) { next(e); }
}
async function traiter(req, res, next) {
  try { res.json({ success: true, data: await service.traiter(req.params.id, req.user.id, req.body) }); } catch (e) { next(e); }
}

module.exports = { lister, getById, traiter };
