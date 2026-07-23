// Contrôleur dotation TIKEXO — zéro logique métier
const service = require('./dotation.service');

// Un ADMIN_RH/GESTIONNAIRE_RH n'agit / ne voit que les dotations de sa propre
// entreprise. SUPER_ADMIN/ADMIN_OPS (backoffice TIKEXO) ne sont pas restreints.
function scopeEntreprise(req) {
  return ['ADMIN_RH', 'GESTIONNAIRE_RH'].includes(req.user.role) ? req.user.entrepriseId : null;
}

async function calculer(req, res, next) {
  try {
    const { entrepriseId, moisConcerne } = req.body;
    res.json({ success: true, data: await service.calculer(entrepriseId, moisConcerne) });
  } catch (e) { next(e); }
}
async function valider(req, res, next) {
  try {
    const { dotationIds } = req.body;
    res.json({ success: true, data: await service.valider(dotationIds, req.user.id, scopeEntreprise(req)) });
  } catch (e) { next(e); }
}
async function distribuer(req, res, next) {
  try {
    const { dotationIds } = req.body;
    res.json({ success: true, data: await service.distribuer(dotationIds, req.user.id, scopeEntreprise(req)) });
  } catch (e) { next(e); }
}
async function ignorer(req, res, next) {
  try {
    const { dotationIds } = req.body;
    res.json({ success: true, data: await service.ignorer(dotationIds, req.user.id, scopeEntreprise(req)) });
  } catch (e) { next(e); }
}
async function lister(req, res, next) {
  try {
    const scope = scopeEntreprise(req);
    const filtres = { ...req.query, ...(scope ? { entrepriseId: scope } : {}) };
    res.json({ success: true, data: await service.lister(filtres) });
  } catch (e) { next(e); }
}
async function getById(req, res, next) {
  try {
    const data = await service.getById(req.params.id);
    const scope = scopeEntreprise(req);
    if (scope && data.entreprise_id !== scope) {
      return res.status(403).json({ success: false, error: 'TIKEXO — Accès refusé à cette dotation' });
    }
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function exportCsv(req, res, next) {
  try {
    const prisma = require('../../config/database');
    const scope = scopeEntreprise(req);
    const where = {};
    if (scope) {
      where.entreprise_id = scope;
    } else if (req.query.entreprise_id) {
      where.entreprise_id = req.query.entreprise_id;
    }
    if (req.query.statut) where.statut = req.query.statut;

    const items = await prisma.dotation.findMany({
      where,
      include: {
        beneficiaire: { select: { nom: true, prenom: true } },
        entreprise: { select: { nom: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const header = 'Date;Entreprise;Bénéficiaire;Allocation mensuelle (XOF);Statut';
    const rows = items.map((d) => [
      new Date(d.createdAt).toLocaleDateString('fr-FR'),
      d.entreprise?.nom ?? '',
      d.beneficiaire ? `${d.beneficiaire.prenom} ${d.beneficiaire.nom}` : '',
      parseFloat(d.montant_total).toFixed(2),
      d.statut,
    ].join(';'));

    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="dotations_${new Date().toISOString().slice(0,10)}.csv"`);
    res.send('﻿' + csv);
  } catch (e) { next(e); }
}

module.exports = { calculer, valider, distribuer, ignorer, lister, getById, exportCsv };
