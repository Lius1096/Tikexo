// Tests de sécurité — immuabilité du ledger TIKEXO — CRITIQUE 100%
const prisma = require('../../config/database');

let walletId, ledgerEntryId, auditLogId;

beforeAll(async () => {
  const entreprise = await prisma.entreprise.create({
    data: {
      nom: 'Sécurité Ledger Test',
      nif: 'NIF-LEDGER-SEC-' + Date.now(),
      kyb_valide: true,
      statut: 'ACTIF',
    },
  });

  const wallet = await prisma.wallet.create({
    data: {
      entreprise_id: entreprise.id,
      type: 'ENTREPRISE',
      solde: 0,
      currency: 'XOF',
    },
  });
  walletId = wallet.id;

  // Créer une LedgerEntry via raw SQL (contournement pour le test)
  await prisma.$executeRaw`
    INSERT INTO "LedgerEntry" (id, type, montant, solde_avant, solde_apres, wallet_destination_id, "createdAt")
    VALUES (gen_random_uuid(), 'RECHARGEMENT', 5000, 0, 5000, ${walletId}, NOW())
  `;

  const entry = await prisma.ledgerEntry.findFirst({ where: { wallet_destination_id: walletId } });
  ledgerEntryId = entry.id;

  // Créer un AuditLog
  await prisma.$executeRaw`
    INSERT INTO "AuditLog" (id, action, entite, entite_id, "createdAt")
    VALUES (gen_random_uuid(), 'TEST', 'Wallet', ${walletId}, NOW())
  `;
  const log = await prisma.auditLog.findFirst({ where: { entite_id: walletId } });
  auditLogId = log.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Immuabilité Ledger — Sécurité TIKEXO — CRITIQUE', () => {
  describe('LedgerEntry', () => {
    it('UPDATE sur LedgerEntry → bloqué par le middleware Prisma', async () => {
      await expect(
        prisma.ledgerEntry.update({
          where: { id: ledgerEntryId },
          data: { montant: 999999 },
        })
      ).rejects.toThrow('immuable');
    });

    it('DELETE sur LedgerEntry → bloqué par le middleware Prisma', async () => {
      await expect(
        prisma.ledgerEntry.delete({ where: { id: ledgerEntryId } })
      ).rejects.toThrow('immuable');
    });

    it('updateMany sur LedgerEntry → bloqué', async () => {
      await expect(
        prisma.ledgerEntry.updateMany({ where: {}, data: { montant: 0 } })
      ).rejects.toThrow('immuable');
    });

    it('deleteMany sur LedgerEntry → bloqué', async () => {
      await expect(
        prisma.ledgerEntry.deleteMany({ where: { id: ledgerEntryId } })
      ).rejects.toThrow('immuable');
    });

    it('upsert sur LedgerEntry → bloqué', async () => {
      await expect(
        prisma.ledgerEntry.upsert({
          where: { id: ledgerEntryId },
          update: { montant: 0 },
          create: { type: 'RECHARGEMENT', montant: 0, solde_avant: 0, solde_apres: 0, wallet_destination_id: walletId },
        })
      ).rejects.toThrow('immuable');
    });
  });

  describe('AuditLog', () => {
    it('UPDATE sur AuditLog → bloqué par le middleware Prisma', async () => {
      await expect(
        prisma.auditLog.update({
          where: { id: auditLogId },
          data: { action: 'FALSIFIE' },
        })
      ).rejects.toThrow('immuable');
    });

    it('DELETE sur AuditLog → bloqué par le middleware Prisma', async () => {
      await expect(
        prisma.auditLog.delete({ where: { id: auditLogId } })
      ).rejects.toThrow('immuable');
    });
  });

  describe('Wallet.solde — modification directe interdite hors ledger.js', () => {
    it('UPDATE wallet.solde via Prisma.update hors ledger.js → bloqué', async () => {
      await expect(
        prisma.wallet.update({
          where: { id: walletId },
          data: { solde: 999999 },
        })
      ).rejects.toThrow('ledger.js');
    });

    it('UPDATE wallet.solde_reserve via Prisma.update → bloqué', async () => {
      await expect(
        prisma.wallet.update({
          where: { id: walletId },
          data: { solde_reserve: 999999 },
        })
      ).rejects.toThrow('ledger.js');
    });

    it('UPDATE wallet.statut (hors solde) via Prisma.update → autorisé', async () => {
      const result = await prisma.wallet.update({
        where: { id: walletId },
        data: { statut: 'GELE' },
      });
      expect(result.statut).toBe('GELE');

      // Restaurer
      await prisma.wallet.update({
        where: { id: walletId },
        data: { statut: 'ACTIF' },
      });
    });

    it('$executeRaw UPDATE wallet.solde → autorisé (contournement légitime de ledger.js)', async () => {
      // Raw SQL bypasse le middleware — c'est le comportement attendu utilisé par ledger.js
      await expect(
        prisma.$executeRaw`UPDATE "Wallet" SET solde = 0 WHERE id = ${walletId}`
      ).resolves.toBeDefined();
    });
  });
});
