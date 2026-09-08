// Réglages globaux de la plateforme TIKEXO, modifiables depuis
// /admin/configuration et persistés en base (PlatformConfig, ligne
// singleton) — remplace un ancien fichier platform-config.json qui vivait
// dans le système de fichiers éphémère du conteneur (perdu à chaque
// redéploiement) et que le reste du backend ne lisait de toute façon jamais :
// les vraies valeurs venaient de variables d'environnement ou de constantes
// en dur, complètement déconnectées de ce que l'admin croyait modifier.
const prisma = require('../config/database');

const CONFIG_ID = 'singleton';

function normaliser(config) {
  return {
    taux_frais_benef_defaut: parseFloat(config.taux_frais_benef_defaut.toString()),
    taux_frais_commercant_defaut: parseFloat(config.taux_frais_commercant_defaut.toString()),
    plafond_journalier: parseFloat(config.plafond_journalier.toString()),
    seuil_ticket_retrait: parseFloat(config.seuil_ticket_retrait.toString()),
  };
}

// Auto-cicatrisant : si la ligne singleton n'existe pas encore (ex. avant la
// migration de seed, ou base de test), la crée avec les valeurs par défaut
// du schéma plutôt que d'échouer.
async function getPlatformConfig() {
  let config = await prisma.platformConfig.findUnique({ where: { id: CONFIG_ID } });
  if (!config) {
    config = await prisma.platformConfig.create({ data: { id: CONFIG_ID } });
  }
  return normaliser(config);
}

async function majPlatformConfig(data) {
  const champs = ['taux_frais_benef_defaut', 'taux_frais_commercant_defaut', 'plafond_journalier', 'seuil_ticket_retrait'];
  const update = {};
  for (const c of champs) {
    if (data[c] !== undefined && data[c] !== null && data[c] !== '') {
      const n = parseFloat(data[c]);
      if (!Number.isNaN(n)) update[c] = n;
    }
  }

  const config = await prisma.platformConfig.upsert({
    where: { id: CONFIG_ID },
    update,
    create: { id: CONFIG_ID, ...update },
  });
  return normaliser(config);
}

module.exports = { getPlatformConfig, majPlatformConfig };
