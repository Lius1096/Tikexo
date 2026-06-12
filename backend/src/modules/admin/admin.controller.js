// Contrôleur admin TIKEXO — zéro logique métier
const service = require('./admin.service');

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
async function getStatsTransactions(req, res, next) {
  try { res.json({ success: true, data: await service.getStatsTransactions(req.query) }); } catch (e) { next(e); }
}
async function getStatsWallets(req, res, next) {
  try { res.json({ success: true, data: await service.getStatsWallets() }); } catch (e) { next(e); }
}

async function getAlertesFraude(req, res, next) {
  try { res.json({ success: true, data: await service.getAlertesFraude(req.query) }); } catch (e) { next(e); }
}

module.exports = { getDashboard, getAuditLogs, getUtilisateurs, bloquerUtilisateur, debloquerUtilisateur, getStatsTransactions, getStatsWallets, getAlertesFraude };
