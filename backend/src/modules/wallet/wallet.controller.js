// Contrôleur wallet TIKEXO — zéro logique métier
const service = require('./wallet.service');

async function getSolde(req, res, next) {
  try { res.json({ success: true, data: await service.getSolde(req.user.id) }); } catch (e) { next(e); }
}
async function getSoldeSegmente(req, res, next) {
  try { res.json({ success: true, data: await service.getSoldeSegmente(req.user.id) }); } catch (e) { next(e); }
}
async function getHistorique(req, res, next) {
  try { res.json({ success: true, data: await service.getHistorique(req.user.id, req.query) }); } catch (e) { next(e); }
}
async function recharger(req, res, next) {
  try {
    const { entrepriseId, montant, telephonePayeur } = req.body;
    res.json({ success: true, data: await service.recharger(entrepriseId, montant, telephonePayeur) });
  } catch (e) { next(e); }
}
async function geler(req, res, next) {
  try { res.json({ success: true, data: await service.geler(req.params.walletId, req.user.id) }); } catch (e) { next(e); }
}
async function degeler(req, res, next) {
  try { res.json({ success: true, data: await service.degeler(req.params.walletId, req.user.id) }); } catch (e) { next(e); }
}

async function crediterBenef(req, res, next) {
  try {
    const { entrepriseId, beneficiaireId, montant } = req.body;
    res.json({ success: true, data: await service.crediterBenef(entrepriseId, beneficiaireId, montant, req.user.id) });
  } catch (e) { next(e); }
}
async function crediterGroupe(req, res, next) {
  try {
    const { entrepriseId, credits } = req.body;
    res.json({ success: true, data: await service.crediterGroupe(entrepriseId, credits, req.user.id) });
  } catch (e) { next(e); }
}

module.exports = { getSolde, getSoldeSegmente, getHistorique, recharger, geler, degeler, crediterBenef, crediterGroupe };
