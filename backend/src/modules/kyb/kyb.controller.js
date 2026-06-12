// Contrôleur KYB TIKEXO
const service = require('./kyb.service');
const prisma = require('../../config/database');

async function getDossier(req, res, next) {
  try {
    const entrepriseId = req.user.entrepriseId;
    if (!entrepriseId) return res.status(403).json({ success: false, message: 'Non rattaché à une entreprise' });
    const data = await service.getDossier(entrepriseId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function uploadDocument(req, res, next) {
  try {
    const entrepriseId = req.user.entrepriseId;
    if (!entrepriseId) return res.status(403).json({ success: false, message: 'Non rattaché à une entreprise' });

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
    }

    const { type } = req.body;
    const typesValides = ['CARTE_NIF', 'EXTRAIT_RCCM', 'PIECE_IDENTITE_DIRIGEANT', 'STATUTS_SOCIETE'];
    if (!typesValides.includes(type)) {
      return res.status(400).json({ success: false, message: 'Type de document invalide' });
    }

    // Vérification taille
    const tailleMax = type === 'STATUTS_SOCIETE' ? service.TAILLE_MAX_STATUTS : service.TAILLE_MAX_DEFAUT;
    if (req.file.size > tailleMax) {
      return res.status(400).json({ success: false, message: `Fichier trop volumineux — max ${tailleMax / 1024 / 1024} Mo` });
    }

    const fichier_url = `/uploads/kyb/${req.file.filename}`;
    const fichier_format = req.file.mimetype.split('/')[1];

    const data = await service.enregistrerDocument(entrepriseId, {
      type,
      fichier_url,
      fichier_nom: req.file.originalname,
      fichier_taille: req.file.size,
      fichier_format,
    });

    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// ── Admin ──────────────────────────────────────────────────────────────────

async function listerDossiers(req, res, next) {
  try {
    const data = await service.listerDossiers(req.query);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function getDossierAdmin(req, res, next) {
  try {
    const data = await service.getDossier(req.params.entrepriseId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function validerDocument(req, res, next) {
  try {
    const data = await service.validerDocument(req.user.id, req.params.id);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function rejeterDocument(req, res, next) {
  try {
    const { motif_rejet } = req.body;
    const data = await service.rejeterDocument(req.user.id, req.params.id, motif_rejet);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function validerGlobal(req, res, next) {
  try {
    const data = await service.validerGlobal(req.user.id, req.params.id);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

module.exports = { getDossier, uploadDocument, listerDossiers, getDossierAdmin, validerDocument, rejeterDocument, validerGlobal };
