// Contrôleur dotation TIKEXO — zéro logique métier
const service = require('./dotation.service');

async function calculer(req, res, next) {
  try {
    const { entrepriseId, moisConcerne } = req.body;
    res.json({ success: true, data: await service.calculer(entrepriseId, moisConcerne) });
  } catch (e) { next(e); }
}
async function valider(req, res, next) {
  try {
    const { dotationIds } = req.body;
    res.json({ success: true, data: await service.valider(dotationIds, req.user.id) });
  } catch (e) { next(e); }
}
async function distribuer(req, res, next) {
  try {
    const { dotationIds } = req.body;
    res.json({ success: true, data: await service.distribuer(dotationIds, req.user.id) });
  } catch (e) { next(e); }
}
async function lister(req, res, next) {
  try { res.json({ success: true, data: await service.lister(req.query) }); } catch (e) { next(e); }
}
async function getById(req, res, next) {
  try { res.json({ success: true, data: await service.getById(req.params.id) }); } catch (e) { next(e); }
}

module.exports = { calculer, valider, distribuer, lister, getById };
