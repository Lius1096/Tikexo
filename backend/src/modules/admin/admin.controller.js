// Contrôleur admin TIKEXO — zéro logique métier
const service = require('./admin.service');
const { texteStructureVersHtml } = require('../../utils/texteEmail');

async function getDashboard(req, res, next) {
  try { res.json({ success: true, data: await service.getDashboard() }); } catch (e) { next(e); }
}
async function getAuditLogs(req, res, next) {
  try { res.json({ success: true, data: await service.getAuditLogs(req.query) }); } catch (e) { next(e); }
}
async function getUtilisateurs(req, res, next) {
  try { res.json({ success: true, data: await service.getUtilisateurs(req.query) }); } catch (e) { next(e); }
}
async function bloquerUtilisateur(req, res, next) {
  try {
    const data = await service.bloquerUtilisateur(req.params.id, req.user.id, req.body.motif);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}
async function debloquerUtilisateur(req, res, next) {
  try {
    const data = await service.debloquerUtilisateur(req.params.id, req.user.id);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function inviterAdminTikexo(req, res, next) {
  try {
    const data = await service.inviterAdminTikexo(req.body, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

async function changerRoleAdmin(req, res, next) {
  try {
    const data = await service.changerRoleAdmin(req.params.id, req.user.id, req.body.role);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}
async function getStatsTransactions(req, res, next) {
  try { res.json({ success: true, data: await service.getStatsTransactions(req.query) }); } catch (e) { next(e); }
}
async function getStatsWallets(req, res, next) {
  try { res.json({ success: true, data: await service.getStatsWallets() }); } catch (e) { next(e); }
}

async function getAlertesFraude(req, res, next) {
  try { res.json({ success: true, data: await service.getAlertesFraude(req.query) }); } catch (e) { next(e); }
}

async function getConfiguration(req, res, next) {
  try { res.json({ success: true, data: await service.getConfiguration() }); } catch (e) { next(e); }
}

async function majConfiguration(req, res, next) {
  try {
    const data = await service.majConfiguration(req.body);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function acquitterAlerteFraude(req, res, next) {
  try {
    const data = await service.acquitterAlerteFraude(req.params.alerteId, req.user.id, req.body.motif);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function envoyerBroadcast(req, res, next) {
  try {
    const data = await service.envoyerBroadcast(req.body, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

async function getBroadcasts(req, res, next) {
  try { res.json({ success: true, data: await service.listerBroadcasts(req.query) }); } catch (e) { next(e); }
}

// Retourne toujours une URL passant par le proxy public /media/broadcast
// (jamais l'URL S3 brute, potentiellement injoignable — cf. S3_ENDPOINT
// interne au réseau docker en prod) : cette pièce jointe doit s'afficher
// dans un email, sans authentification possible côté destinataire.
async function uploadPieceJointeBroadcast(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Aucun fichier reçu' });
    const url = process.env.S3_ENDPOINT
      ? `${process.env.FRONTEND_URL || 'https://tikexo.kete.fr'}/media/broadcast/${req.file.filename}`
      : req.file.url;
    res.status(201).json({ success: true, data: { url } });
  } catch (e) { next(e); }
}

async function getEmailTemplates(req, res, next) {
  try { res.json({ success: true, data: await service.listerEmailTemplates() }); } catch (e) { next(e); }
}

async function majEmailTemplate(req, res, next) {
  try { res.json({ success: true, data: await service.upsertEmailTemplate(req.params.cle, req.body, req.user.id) }); } catch (e) { next(e); }
}

async function reinitialiserEmailTemplate(req, res, next) {
  try { res.json({ success: true, data: await service.supprimerEmailTemplate(req.params.cle, req.user.id) }); } catch (e) { next(e); }
}

async function getCguAdmin(req, res, next) {
  try { res.json({ success: true, data: await service.getCguActuelle() }); } catch (e) { next(e); }
}

async function getCguHistorique(req, res, next) {
  try { res.json({ success: true, data: await service.listerVersionsCgu() }); } catch (e) { next(e); }
}

async function publierCgu(req, res, next) {
  try { res.status(201).json({ success: true, data: await service.publierCgu(req.body.contenu, req.user.id) }); } catch (e) { next(e); }
}

async function listerDemandesPlafond(req, res, next) {
  try {
    const entrepriseService = require('../entreprise/entreprise.service');
    const data = await entrepriseService.listerDemandesPlafond(req.query);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function traiterDemandePlafond(req, res, next) {
  try {
    const entrepriseService = require('../entreprise/entreprise.service');
    const data = await entrepriseService.traiterDemandePlafond(req.params.id, req.body, req.user.id);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// Public — voir routes.js — pas de vérification de rôle admin ici.
async function getCguPublique(req, res, next) {
  try {
    const version = await service.getCguActuelle();
    if (!version) return res.json({ success: true, data: null });
    res.json({ success: true, data: { ...version, contenu_html: texteStructureVersHtml(version.contenu) } });
  } catch (e) { next(e); }
}

module.exports = {
  getDashboard, getAuditLogs, getUtilisateurs, inviterAdminTikexo, changerRoleAdmin,
  bloquerUtilisateur, debloquerUtilisateur, getStatsTransactions, getStatsWallets,
  getAlertesFraude, getConfiguration, majConfiguration, acquitterAlerteFraude,
  listerDemandesPlafond, traiterDemandePlafond, envoyerBroadcast, getBroadcasts,
  uploadPieceJointeBroadcast, getEmailTemplates, majEmailTemplate, reinitialiserEmailTemplate,
  getCguAdmin, getCguHistorique, publierCgu, getCguPublique,
};
