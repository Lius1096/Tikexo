const service = require('./carte.service');

async function creerVirtuelle(req, res, next) {
  try {
    const data = await service.creerVirtuelle(req.user.id);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

async function getMaCarte(req, res, next) {
  try {
    const data = await service.getMaCarte(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getCVV(req, res, next) {
  try {
    const data = await service.getCVV(req.user.id, req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getQRCode(req, res, next) {
  try {
    const data = await service.getQRCode(req.user.id, req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function validerQR(req, res, next) {
  try {
    const { payload, signature } = req.body;
    if (!payload || !signature) return res.status(400).json({ success: false, error: 'payload et signature requis' });
    const data = await service.validerQR(payload, signature);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function validerNFC(req, res, next) {
  try {
    const { token, signature } = req.body;
    if (!token || !signature) return res.status(400).json({ success: false, error: 'token et signature requis' });
    const data = await service.validerNFC(token, signature);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function bloquerMaCarte(req, res, next) {
  try {
    const data = await service.bloquer(req.params.id, req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function demanderPhysique(req, res, next) {
  try {
    const { adresse_livraison } = req.body;
    if (!adresse_livraison) return res.status(400).json({ success: false, error: 'adresse_livraison requise' });
    const data = await service.demanderPhysique(req.user.id, adresse_livraison);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

async function activerPhysique(req, res, next) {
  try {
    const { code_activation } = req.body;
    if (!code_activation) return res.status(400).json({ success: false, error: 'code_activation requis' });
    const data = await service.activerPhysique(req.user.id, req.params.id, code_activation);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function demanderPhysiqueEmployeur(req, res, next) {
  try {
    const { adresse_livraison } = req.body;
    if (!adresse_livraison) return res.status(400).json({ success: false, error: 'adresse_livraison requise' });
    const data = await service.demanderPhysiqueEmployeur(req.params.userId, adresse_livraison, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

// ─── Admin / Employeur ────────────────────────────────────────────────────────

async function lister(req, res, next) {
  try {
    const { entrepriseId } = req.query;
    const data = entrepriseId
      ? await service.lister(entrepriseId)
      : await service.listerTout(req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function listerDemandes(req, res, next) {
  try {
    const data = await service.listerDemandes(req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function validerDemande(req, res, next) {
  try {
    const data = await service.validerDemande(req.params.id, req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function creer(req, res, next) {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'userId requis' });
    const data = await service.creer(userId, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

async function bloquer(req, res, next) {
  try {
    const data = await service.bloquer(req.params.id, req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function debloquer(req, res, next) {
  try {
    const data = await service.debloquer(req.params.id, req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

module.exports = {
  creerVirtuelle, getMaCarte, getCVV, getQRCode, validerQR, validerNFC,
  bloquerMaCarte, demanderPhysique, demanderPhysiqueEmployeur, activerPhysique,
  listerDemandes, validerDemande, lister, creer, bloquer, debloquer,
};
