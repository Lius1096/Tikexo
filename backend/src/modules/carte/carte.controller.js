const service = require('./carte.service');

async function lister(req, res, next) {
  try {
    const { entrepriseId } = req.query;
    if (entrepriseId) {
      const data = await service.lister(entrepriseId);
      return res.json({ success: true, data });
    }
    const data = await service.listerTout(req.query);
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

async function getMaCarte(req, res, next) {
  try {
    const data = await service.getMaCarte(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

module.exports = { lister, creer, bloquer, debloquer, getMaCarte };
