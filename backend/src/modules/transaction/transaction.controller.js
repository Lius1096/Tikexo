// Contrôleur transaction TIKEXO — zéro logique métier
const service = require('./transaction.service');

async function creer(req, res, next) {
  try {
    const data = await service.creer(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}
async function lister(req, res, next) {
  try { res.json({ success: true, data: await service.lister(req.user.id, req.user.role, req.query) }); } catch (e) { next(e); }
}
async function getById(req, res, next) {
  try { res.json({ success: true, data: await service.getById(req.params.id) }); } catch (e) { next(e); }
}
async function annuler(req, res, next) {
  try { res.json({ success: true, data: await service.annuler(req.params.id, req.user.id) }); } catch (e) { next(e); }
}

async function exportCsv(req, res, next) {
  try {
    const prisma = require('../../config/database');
    const userId = req.user.id;
    const role = req.user.role;
    const where = {};

    if (role === 'BENEFICIAIRE') where.beneficiaire_id = userId;
    else if (role === 'COMMERCANT') {
      const c = await prisma.commercant.findUnique({ where: { user_id: userId } });
      if (c) where.commercant_id = c.id;
    } else if (role === 'ADMIN_RH' || role === 'GESTIONNAIRE_RH') {
      const adminLink = await prisma.entrepriseAdmin.findFirst({ where: { user_id: userId } });
      if (adminLink) {
        const liens = await prisma.lienEntrepriseBeneficiaire.findMany({
          where: { entreprise_id: adminLink.entreprise_id, statut: 'ACTIF' },
          select: { user_id: true },
        });
        where.beneficiaire_id = { in: liens.map((l) => l.user_id) };
      }
    }

    const items = await prisma.transaction.findMany({
      where,
      include: {
        commercant: { select: { nom: true } },
        beneficiaire: { select: { nom: true, prenom: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const header = 'Date;Bénéficiaire;Commerçant;Montant;Commission;Statut';
    const rows = items.map((t) => [
      new Date(t.createdAt).toLocaleDateString('fr-FR'),
      t.beneficiaire ? `${t.beneficiaire.prenom} ${t.beneficiaire.nom}` : '',
      t.commercant?.nom ?? '',
      parseFloat(t.montant_total).toFixed(2),
      parseFloat(t.commission_tikexo ?? 0).toFixed(2),
      t.statut,
    ].join(';'));

    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="transactions_${new Date().toISOString().slice(0,10)}.csv"`);
    res.send('﻿' + csv); // BOM UTF-8 pour Excel
  } catch (e) { next(e); }
}

module.exports = { creer, lister, getById, annuler, exportCsv };
