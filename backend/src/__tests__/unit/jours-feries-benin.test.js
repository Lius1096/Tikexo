// Tests unitaires — jours-feries-benin.js
const { estJourFerie, estDimanche, estEligible, compterJoursOuvresMois } = require('../../utils/jours-feries-benin');

describe('jours-feries-benin.js — calendrier Bénin TIKEXO', () => {
  describe('estJourFerie', () => {
    it('retourne true pour le Nouvel An (01/01/2026)', () => {
      expect(estJourFerie('2026-01-01')).toBe(true);
    });

    it('retourne true pour la Fête du Vodoun (10/01/2026)', () => {
      expect(estJourFerie('2026-01-10')).toBe(true);
    });

    it('retourne true pour la Fête Nationale du Bénin (01/08/2026)', () => {
      expect(estJourFerie('2026-08-01')).toBe(true);
    });

    it('retourne false pour un jour ordinaire (15/03/2026)', () => {
      expect(estJourFerie('2026-03-15')).toBe(false);
    });

    it('retourne true pour la Fête du Travail (01/05/2026)', () => {
      expect(estJourFerie('2026-05-01')).toBe(true);
    });

    it('retourne true pour Noël (25/12/2026)', () => {
      expect(estJourFerie('2026-12-25')).toBe(true);
    });
  });

  describe('estDimanche', () => {
    it('retourne true pour le dimanche 07/06/2026', () => {
      expect(estDimanche('2026-06-07')).toBe(true);
    });

    it('retourne false pour un lundi', () => {
      expect(estDimanche('2026-06-08')).toBe(false);
    });
  });

  describe('estEligible', () => {
    it('retourne true pour le lundi 08/06/2026 (jour ouvré)', () => {
      expect(estEligible('2026-06-08')).toBe(true);
    });

    it('retourne false pour le dimanche 07/06/2026', () => {
      expect(estEligible('2026-06-07')).toBe(false);
    });

    it('retourne false pour le 01/01/2026 (jour férié)', () => {
      expect(estEligible('2026-01-01')).toBe(false);
    });

    it('retourne false pour le 01/08/2026 (Indépendance)', () => {
      expect(estEligible('2026-08-01')).toBe(false);
    });
  });

  describe('compterJoursOuvresMois', () => {
    it('retourne un nombre raisonnable pour juin 2026 (18-22 jours)', () => {
      const jours = compterJoursOuvresMois(2026, 6);
      expect(jours).toBeGreaterThanOrEqual(18);
      expect(jours).toBeLessThanOrEqual(22);
    });

    it('est inférieur aux jours ouvrés de janvier (Vodoun + Nouvel An)', () => {
      const joursJanvier = compterJoursOuvresMois(2026, 1);
      const joursJuin = compterJoursOuvresMois(2026, 6);
      expect(joursJanvier).toBeLessThan(joursJuin);
    });
  });
});
