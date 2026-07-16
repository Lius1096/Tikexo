// Jours fériés et ouvrés du Bénin — TIKEXO
// Utilisé pour le calcul des dotations et la validation des transactions

// Jours fériés fixes au Bénin (MM-DD)
const FERIES_FIXES = new Set([
  '01-01', // Nouvel An
  '01-10', // Fête du Vodoun (Fête Nationale des Religions Traditionnelles)
  '04-18', // Pâques (variable — Vendredi Saint approximé ici)
  '05-01', // Fête du Travail
  '05-10', // Ascension (variable — approximé)
  '08-01', // Fête Nationale (Indépendance du Bénin)
  '08-15', // Assomption
  '11-01', // Toussaint
  '11-02', // Commémoration des Défunts
  '11-30', // Fête de l'AÏd el-Fitr (variable — approximé)
  '12-25', // Noël
  '12-26', // Lendemain de Noël
]);

// Jours fériés religieux variables (calculés dynamiquement pour une année donnée)
// Ces dates sont approximatives — en production, utiliser une API de calendrier liturgique
function getFeriesVariables(annee) {
  const feries = [];

  // Calcul de Pâques (algorithme de Meeus/Jones/Butcher)
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;

  const paques = new Date(annee, mois - 1, jour);

  // Lundi de Pâques
  const lundiPaques = new Date(paques);
  lundiPaques.setDate(paques.getDate() + 1);
  feries.push(lundiPaques);

  // Ascension (40 jours après Pâques)
  const ascension = new Date(paques);
  ascension.setDate(paques.getDate() + 39);
  feries.push(ascension);

  // Lundi de Pentecôte (50 jours après Pâques)
  const pentecote = new Date(paques);
  pentecote.setDate(paques.getDate() + 50);
  feries.push(pentecote);

  return feries;
}

/**
 * Vérifie si une date est un jour férié au Bénin.
 */
function estJourFerie(date) {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const moisJour = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

  if (FERIES_FIXES.has(moisJour)) return true;

  const feriesVariables = getFeriesVariables(d.getFullYear());
  return feriesVariables.some(
    (f) => f.getDate() === d.getDate() && f.getMonth() === d.getMonth()
  );
}

/**
 * Vérifie si une date est un dimanche.
 */
function estDimanche(date) {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return d.getDay() === 0;
}

/**
 * Vérifie si une date est un samedi.
 */
function estSamedi(date) {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return d.getDay() === 6;
}

/**
 * Vérifie si une date est un jour ouvré pour les transactions (ni férié, ni dimanche).
 * Le samedi reste éligible pour les paiements en restaurant.
 */
function estEligible(date) {
  return !estJourFerie(date) && !estDimanche(date);
}

/**
 * Vérifie si une date est un jour ouvré pour les dotations (lundi → vendredi, ni férié).
 * Les samedis sont exclus du calcul des titres-restaurant.
 */
function estJourOuvreDotation(date) {
  return !estJourFerie(date) && !estDimanche(date) && !estSamedi(date);
}

/**
 * Compte les jours ouvrés (lundi→vendredi, hors fériés) dans un mois donné.
 * Utilisé pour calculer le nombre de titres-restaurant à attribuer.
 */
function compterJoursOuvresMois(annee, mois) {
  const premier = new Date(annee, mois - 1, 1);
  const dernier = new Date(annee, mois, 0);
  let count = 0;

  for (let d = new Date(premier); d <= dernier; d.setDate(d.getDate() + 1)) {
    if (estJourOuvreDotation(new Date(d))) count++;
  }

  return count;
}

/**
 * Retourne la liste des jours ouvrés (lundi→vendredi, hors fériés) d'un mois.
 */
function getJoursOuvresMois(annee, mois) {
  const premier = new Date(annee, mois - 1, 1);
  const dernier = new Date(annee, mois, 0);
  const jours = [];

  for (let d = new Date(premier); d <= dernier; d.setDate(d.getDate() + 1)) {
    if (estJourOuvreDotation(new Date(d))) {
      jours.push(new Date(d));
    }
  }

  return jours;
}

module.exports = {
  estJourFerie,
  estDimanche,
  estSamedi,
  estEligible,
  estJourOuvreDotation,
  compterJoursOuvresMois,
  getJoursOuvresMois,
};
