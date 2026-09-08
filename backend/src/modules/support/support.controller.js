// Contrôleur support TIKEXO — zéro logique métier
const service = require('./support.service');

async function creerTicket(req, res, next) {
  try {
    const data = await service.creerTicket(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

async function getMesTickets(req, res, next) {
  try { res.json({ success: true, data: await service.listerMesTickets(req.user.id) }); } catch (e) { next(e); }
}

async function getTicketsAdmin(req, res, next) {
  try { res.json({ success: true, data: await service.listerTicketsAdmin(req.query) }); } catch (e) { next(e); }
}

async function getTicket(req, res, next) {
  try { res.json({ success: true, data: await service.getTicketAutorise(req.params.id, req.user) }); } catch (e) { next(e); }
}

async function ajouterMessage(req, res, next) {
  try {
    const data = await service.ajouterMessage(req.params.id, req.user, req.body.message);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function changerStatut(req, res, next) {
  try {
    const data = await service.changerStatutTicket(req.params.id, req.user.id, req.body.statut);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

module.exports = { creerTicket, getMesTickets, getTicketsAdmin, getTicket, ajouterMessage, changerStatut };
