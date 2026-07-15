// Contrôleur bénéficiaire TIKEXO — zéro logique métier
const service = require('./beneficiaire.service');

async function lister(req, res, next) {
  try { res.json({ success: true, data: await service.lister(req.query) }); } catch (e) { next(e); }
}
async function creer(req, res, next) {
  try { res.status(201).json({ success: true, data: await service.creer(req.body) }); } catch (e) { next(e); }
}
async function getById(req, res, next) {
  try { res.json({ success: true, data: await service.getById(req.params.id) }); } catch (e) { next(e); }
}
async function modifier(req, res, next) {
  try { res.json({ success: true, data: await service.modifier(req.params.id, req.body) }); } catch (e) { next(e); }
}
async function rechercherParTelephone(req, res, next) {
  try {
    const { normaliserTelephone } = require('../../utils/telephone');
    const prisma = require('../../config/database');
    const telephone = normaliserTelephone(`+229${req.body.telephone?.replace(/\D/g, '')}`);
    const user = await prisma.user.findUnique({
      where: { telephone },
      select: { id: true, nom: true, prenom: true, telephone: true, statut: true },
    });
    res.json({ success: true, data: user || null });
  } catch (e) { next(e); }
}

async function rattacherEntreprise(req, res, next) {
  try { res.json({ success: true, data: await service.rattacherEntreprise(req.params.id, req.body, req.user.id) }); } catch (e) { next(e); }
}
async function traiterSortie(req, res, next) {
  try {
    const data = await service.traiterSortie(req.params.id, req.body.entrepriseId, req.user.id, req.body);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

module.exports = { lister, creer, getById, modifier, rechercherParTelephone, rattacherEntreprise, traiterSortie };
