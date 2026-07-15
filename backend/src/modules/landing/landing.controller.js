const landingService = require('./landing.service');

async function getAllConfig(req, res) {
  try {
    const config = await landingService.getAllConfig();
    res.json({ success: true, data: config });
  } catch (err) {
    console.error('landing getAllConfig error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}

async function getSection(req, res) {
  try {
    const { section } = req.params;
    const data = await landingService.getSection(section);
    if (!data) return res.status(404).json({ success: false, message: 'Section introuvable' });
    res.json({ success: true, data });
  } catch (err) {
    console.error('landing getSection error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}

async function upsertSection(req, res) {
  try {
    const { section } = req.params;
    const validSections = ['hero', 'stats', 'how_it_works', 'actors', 'pricing', 'cta'];
    if (!validSections.includes(section)) {
      return res.status(400).json({ success: false, message: 'Section invalide' });
    }
    const updated = await landingService.upsertSection(section, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('landing upsertSection error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}

async function uploadImage(req, res) {
  try {
    if (!req.file || !req.file.url) {
      return res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
    }
    res.json({ success: true, url: req.file.url });
  } catch (err) {
    console.error('landing uploadImage error:', err);
    res.status(500).json({ success: false, message: 'Erreur upload' });
  }
}

module.exports = { getAllConfig, getSection, upsertSection, uploadImage };
