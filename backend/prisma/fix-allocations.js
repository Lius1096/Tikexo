// Script one-shot : corrige les allocation_mensuelle remis à 5000 par la migration
// Tourne au démarrage via start:prod, est idempotent (UPDATE avec valeurs fixes par niveau)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ALLOCATION_PAR_NIVEAU = { EMPLOYE: 5000, CADRE: 8000, MANAGER: 10000, DIRECTEUR: 15000 };

async function main() {
  for (const [niveau, montant] of Object.entries(ALLOCATION_PAR_NIVEAU)) {
    const { count } = await prisma.lienEntrepriseBeneficiaire.updateMany({
      where: { niveau, allocation_mensuelle: 5000 },
      data: { allocation_mensuelle: montant },
    });
    if (count > 0) console.log(`fix-allocations: ${count} lien(s) ${niveau} → ${montant} XOF`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
