// Contrôleur commerçant TIKEXO — zéro logique métier
const service = require('./commercant.service');

async function nearby(req, res, next) {
  try {
    const { lat, lng, rayon, categorie, ouvert } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, error: 'lat et lng requis' });
    const result = await service.rechercherCommercantsProches({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      rayon,
      categorie,
      ouvert,
    });
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
}

async function fiche(req, res, next) {
  try {
    const { lat, lng } = req.query;
    const data = await service.getFicheCommercant(req.params.id, {
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
    });
    if (!data) return res.status(404).json({ success: false, error: 'Commerçant introuvable' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function lister(req, res, next) {
  try { res.json({ success: true, data: await service.lister(req.query) }); } catch (e) { next(e); }
}
async function creer(req, res, next) {
  try { res.status(201).json({ success: true, data: await service.creer(req.body, req.user.id) }); } catch (e) { next(e); }
}
async function getById(req, res, next) {
  try { res.json({ success: true, data: await service.getById(req.params.id) }); } catch (e) { next(e); }
}
async function modifier(req, res, next) {
  try { res.json({ success: true, data: await service.modifier(req.params.id, req.body) }); } catch (e) { next(e); }
}
async function valider(req, res, next) {
  try { res.json({ success: true, data: await service.valider(req.params.id, req.user.id) }); } catch (e) { next(e); }
}
async function activer(req, res, next) {
  try { res.json({ success: true, data: await service.activer(req.params.id, req.user.id) }); } catch (e) { next(e); }
}
async function suspendre(req, res, next) {
  try { res.json({ success: true, data: await service.suspendre(req.params.id, req.user.id) }); } catch (e) { next(e); }
}
async function parProximite(req, res, next) {
  try { res.json({ success: true, data: await service.parProximite(req.query) }); } catch (e) { next(e); }
}
async function regenererQRCode(req, res, next) {
  try { res.json({ success: true, data: await service.regenererQRCode(req.params.id) }); } catch (e) { next(e); }
}

async function getMoi(req, res, next) {
  try {
    const data = await service.getByUserId(req.user.id);
    if (!data) return res.status(404).json({ success: false, error: 'Profil commerçant introuvable' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function demanderPayout(req, res, next) {
  try {
    const { declencherPayout } = require('../fedapay/fedapay.service');
    const prisma = require('../../config/database');
    const commercant = await prisma.commercant.findUniqueOrThrow({ where: { user_id: req.user.id } });
    const result = await declencherPayout(prisma, commercant.id);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
}

module.exports = { lister, creer, getById, modifier, valider, activer, suspendre, parProximite, nearby, fiche, regenererQRCode, getMoi, demanderPayout };
