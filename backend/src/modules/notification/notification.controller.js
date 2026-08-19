const service = require('./notification.service');

async function lister(req, res, next) {
  try {
    const data = await service.lister(req.user.id, req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function compterNonLues(req, res, next) {
  try {
    const data = await service.compterNonLues(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function marquerLu(req, res, next) {
  try {
    const data = await service.marquerLu(req.user.id, req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function marquerToutLu(req, res, next) {
  try {
    const data = await service.marquerToutLu(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

module.exports = { lister, compterNonLues, marquerLu, marquerToutLu };
