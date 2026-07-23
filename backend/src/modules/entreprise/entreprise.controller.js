// Contrôleur entreprise TIKEXO — zéro logique métier
const service = require('./entreprise.service');

async function lister(req, res, next) {
  try {
    const data = await service.lister(req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function creer(req, res, next) {
  try {
    const data = await service.creer(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const data = await service.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function modifier(req, res, next) {
  try {
    const data = await service.modifier(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function validerKYB(req, res, next) {
  try {
    const data = await service.validerKYB(req.params.id, req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function suspendre(req, res, next) {
  try {
    const data = await service.suspendre(req.params.id, req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function archiver(req, res, next) {
  try {
    const data = await service.archiver(req.params.id, req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getBeneficiaires(req, res, next) {
  try {
    const data = await service.getBeneficiaires(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getWallet(req, res, next) {
  try {
    const data = await service.getWallet(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getEquipeRH(req, res, next) {
  try {
    const data = await service.getEquipeRH(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function inviterRh(req, res, next) {
  try {
    const data = await service.inviterRh(req.params.id, req.body, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

async function retirerRh(req, res, next) {
  try {
    const data = await service.retirerRh(req.params.id, req.params.userId, req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function toggleStatutUser(req, res, next) {
  try {
    const data = await service.toggleStatutUser(req.params.userId, req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getStats(req, res, next) {
  try {
    const data = await service.getStats(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getFacturation(req, res, next) {
  try {
    const data = await service.getFacturation(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

module.exports = { lister, creer, getById, modifier, validerKYB, suspendre, archiver, getBeneficiaires, getWallet, getEquipeRH, inviterRh, retirerRh, toggleStatutUser, getStats, getFacturation };
