// Tests unitaires — utils/geo.js TIKEXO
const {
  calculerDistance,
  formaterDistance,
  estimerDureeAPied,
  estOuvertMaintenant,
  estDansBenin,
} = require('../../utils/geo');

// Horaires de référence pour les tests
const horairesStandard = {
  lundi:    { ouverture: '07:00', fermeture: '21:00' },
  mardi:    { ouverture: '07:00', fermeture: '21:00' },
  mercredi: { ouverture: '07:00', fermeture: '21:00' },
  jeudi:    { ouverture: '07:00', fermeture: '21:00' },
  vendredi: { ouverture: '07:00', fermeture: '21:00' },
  samedi:   { ouverture: '08:00', fermeture: '18:00' },
  dimanche: null,
};

describe('geo.js — Haversine et utilitaires TIKEXO', () => {
  describe('calculerDistance', () => {
    it('Distance Cotonou centre → légèrement nord-est : entre 600 et 650 mètres', () => {
      // Coordonnées réelles Cotonou (6.3654, 2.4183) → (6.3700, 2.4220)
      const dist = calculerDistance(6.3654, 2.4183, 6.3700, 2.4220);
      expect(dist).toBeGreaterThan(600);
      expect(dist).toBeLessThan(650);
    });

    it('Distance entre deux points identiques = 0', () => {
      expect(calculerDistance(6.3654, 2.4183, 6.3654, 2.4183)).toBe(0);
    });

    it('Distance entre Cotonou et Paris ≈ 5 500 km', () => {
      // Paris (48.8566, 2.3522) vs Cotonou (6.3654, 2.4183)
      const dist = calculerDistance(6.3654, 2.4183, 48.8566, 2.3522);
      expect(dist).toBeGreaterThan(5_400_000);
      expect(dist).toBeLessThan(5_600_000);
    });

    it('La distance est symétrique (A→B = B→A)', () => {
      const d1 = calculerDistance(6.3654, 2.4183, 6.3700, 2.4220);
      const d2 = calculerDistance(6.3700, 2.4220, 6.3654, 2.4183);
      expect(Math.abs(d1 - d2)).toBeLessThan(0.001);
    });
  });

  describe('formaterDistance', () => {
    it('formaterDistance(350) → "350 m"', () => {
      expect(formaterDistance(350)).toBe('350 m');
    });

    it('formaterDistance(999) → "999 m"', () => {
      expect(formaterDistance(999)).toBe('999 m');
    });

    it('formaterDistance(1250) → "1,3 km"', () => {
      expect(formaterDistance(1250)).toBe('1,3 km');
    });

    it('formaterDistance(5000) → "5,0 km"', () => {
      expect(formaterDistance(5000)).toBe('5,0 km');
    });

    it('formaterDistance(0) → "0 m"', () => {
      expect(formaterDistance(0)).toBe('0 m');
    });
  });

  describe('estimerDureeAPied', () => {
    it('estimerDureeAPied(320) → "~4 min" (320/80 = 4)', () => {
      expect(estimerDureeAPied(320)).toBe('~4 min');
    });

    it('estimerDureeAPied(0) → "~0 min"', () => {
      expect(estimerDureeAPied(0)).toBe('~0 min');
    });

    it('estimerDureeAPied(1200) → "~15 min"', () => {
      expect(estimerDureeAPied(1200)).toBe('~15 min');
    });

    it('Arrondi au plafond : 81 m → "~2 min" (ceil(81/80))', () => {
      expect(estimerDureeAPied(81)).toBe('~2 min');
    });
  });

  describe('estOuvertMaintenant', () => {
    it('null comme horaires → false', () => {
      expect(estOuvertMaintenant(null)).toBe(false);
    });

    it('Horaires null (objet vide) → false', () => {
      expect(estOuvertMaintenant({})).toBe(false);
    });

    it('RÈGLE TIKEXO : dimanche toujours fermé même si horaires définis', () => {
      // Forcer l'heure à un dimanche midi en Bénin
      const { DateTime } = require('luxon');
      const mockNow = jest.spyOn(DateTime, 'now').mockReturnValue(
        DateTime.fromISO('2026-06-14T12:00:00', { zone: 'Africa/Porto-Novo' }) // dimanche
      );

      const horairesDimanche = { ...horairesStandard, dimanche: { ouverture: '08:00', fermeture: '22:00' } };
      expect(estOuvertMaintenant(horairesDimanche, 'Africa/Porto-Novo')).toBe(false);

      mockNow.mockRestore();
    });

    it('Lundi 12h → ouvert (dans 07:00-21:00)', () => {
      const { DateTime } = require('luxon');
      const mockNow = jest.spyOn(DateTime, 'now').mockReturnValue(
        DateTime.fromISO('2026-06-15T12:00:00', { zone: 'Africa/Porto-Novo' }) // lundi
      );

      expect(estOuvertMaintenant(horairesStandard, 'Africa/Porto-Novo')).toBe(true);
      mockNow.mockRestore();
    });

    it('Lundi 06:59 → fermé (avant ouverture 07:00)', () => {
      const { DateTime } = require('luxon');
      const mockNow = jest.spyOn(DateTime, 'now').mockReturnValue(
        DateTime.fromISO('2026-06-15T06:59:00', { zone: 'Africa/Porto-Novo' })
      );

      expect(estOuvertMaintenant(horairesStandard, 'Africa/Porto-Novo')).toBe(false);
      mockNow.mockRestore();
    });

    it('Lundi 21:00 exact → fermé (fermeture exclusive)', () => {
      const { DateTime } = require('luxon');
      const mockNow = jest.spyOn(DateTime, 'now').mockReturnValue(
        DateTime.fromISO('2026-06-15T21:00:00', { zone: 'Africa/Porto-Novo' })
      );

      expect(estOuvertMaintenant(horairesStandard, 'Africa/Porto-Novo')).toBe(false);
      mockNow.mockRestore();
    });

    it('Samedi 17:59 → ouvert (dans 08:00-18:00)', () => {
      const { DateTime } = require('luxon');
      const mockNow = jest.spyOn(DateTime, 'now').mockReturnValue(
        DateTime.fromISO('2026-06-13T17:59:00', { zone: 'Africa/Porto-Novo' }) // samedi
      );

      expect(estOuvertMaintenant(horairesStandard, 'Africa/Porto-Novo')).toBe(true);
      mockNow.mockRestore();
    });
  });

  describe('estDansBenin', () => {
    it('Cotonou (6.37, 2.42) → dans le Bénin', () => {
      expect(estDansBenin(6.37, 2.42)).toBe(true);
    });

    it('Paris (48.86, 2.35) → hors Bénin', () => {
      expect(estDansBenin(48.86, 2.35)).toBe(false);
    });

    it('Abidjan (5.35, -4.00) → hors Bénin (lng négative)', () => {
      expect(estDansBenin(5.35, -4.0)).toBe(false);
    });

    it('Parakou (9.34, 2.62) → dans le Bénin (nord)', () => {
      expect(estDansBenin(9.34, 2.62)).toBe(true);
    });
  });
});
