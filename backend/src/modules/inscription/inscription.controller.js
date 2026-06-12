const service = require('./inscription.service');

async function inscrire(req, res, next) {
  try {
    const data = await service.inscrire(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = { inscrire };
