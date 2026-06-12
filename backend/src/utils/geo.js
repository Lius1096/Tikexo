// Utilitaires géolocalisation TIKEXO — formule Haversine + horaires Bénin
const { DateTime } = require('luxon');

const RAYON_TERRE_M = 6371000;
const VITESSE_PIETON_M_MIN = 80;
const TIMEZONE_BENIN = 'Africa/Porto-Novo';

// Frontières géographiques du Bénin (validation admin)
const BENIN_BOUNDS = { latMin: 6.0, latMax: 12.5, lngMin: 0.8, lngMax: 3.9 };

/**
 * Calcule la distance en mètres entre deux points GPS (formule Haversine).
 */
function calculerDistance(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lng2 - lng1);

  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return RAYON_TERRE_M * c;
}

/**
 * Formate une distance en mètres en chaîne lisible.
 * < 1000 → "350 m" ; >= 1000 → "1,2 km"
 */
function formaterDistance(metres) {
  if (metres < 1000) {
    return `${Math.round(metres)} m`;
  }
  const km = metres / 1000;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/**
 * Estime la durée de marche à pied à 80 m/min.
 * Retourne "~4 min", "~12 min", etc.
 */
function estimerDureeAPied(metres) {
  const minutes = Math.ceil(metres / VITESSE_PIETON_M_MIN);
  return `~${minutes} min`;
}

/**
 * Détermine si un commerçant est ouvert en ce moment.
 * RÈGLE TIKEXO : dimanche toujours fermé même si horaires définis.
 *
 * @param {Object|null} horaires — JSON horaires par jour de semaine
 * @param {string} timezone — "Africa/Porto-Novo"
 * @returns {boolean}
 */
function estOuvertMaintenant(horaires, timezone = TIMEZONE_BENIN) {
  if (!horaires) return false;

  const maintenant = DateTime.now().setZone(timezone);
  const jourSemaine = maintenant.weekday; // 1=lundi … 7=dimanche

  // RÈGLE TIKEXO : dimanche (7) toujours fermé
  if (jourSemaine === 7) return false;

  const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const nomJour = JOURS[jourSemaine - 1];
  const plage = horaires[nomJour];

  if (!plage || !plage.ouverture || !plage.fermeture) return false;

  const [hOuv, mOuv] = plage.ouverture.split(':').map(Number);
  const [hFer, mFer] = plage.fermeture.split(':').map(Number);

  const ouverture = maintenant.set({ hour: hOuv, minute: mOuv, second: 0, millisecond: 0 });
  const fermeture = maintenant.set({ hour: hFer, minute: mFer, second: 0, millisecond: 0 });

  return maintenant >= ouverture && maintenant < fermeture;
}

/**
 * Vérifie si des coordonnées sont dans les frontières du Bénin.
 */
function estDansBenin(lat, lng) {
  return (
    lat >= BENIN_BOUNDS.latMin &&
    lat <= BENIN_BOUNDS.latMax &&
    lng >= BENIN_BOUNDS.lngMin &&
    lng <= BENIN_BOUNDS.lngMax
  );
}

module.exports = {
  calculerDistance,
  formaterDistance,
  estimerDureeAPied,
  estOuvertMaintenant,
  estDansBenin,
  TIMEZONE_BENIN,
};
