const service = require('./inscription.service');

async function inscrire(req, res, next) {
  try {
    const data = await service.inscrire(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function uploadDocumentInscription(req, res, next) {
  try {
    const { entreprise_id, type } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
    }
    const data = await service.uploadDocumentInscription({
      entreprise_id,
      type,
      fichier: req.file,
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function inscrireCommercant(req, res, next) {
  try {
    const data = await service.inscrireCommercant(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = { inscrire, uploadDocumentInscription, inscrireCommercant };
