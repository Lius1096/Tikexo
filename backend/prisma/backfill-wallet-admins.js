// Script one-shot : crée un wallet bénéficiaire + un lien entreprise pour
// les comptes RH/Directeur existants qui n'en ont pas (créés avant que
// entreprise.service.js#inviterRh ne le fasse automatiquement). Idempotent
// — sûr à relancer, ne touche pas les comptes déjà complets.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.entrepriseAdmin.findMany({
    select: { entreprise_id: true, user_id: true },
  });

  let completes = 0;
  for (const admin of admins) {
    const walletExistant = await prisma.wallet.findFirst({
      where: { user_id: admin.user_id, type: 'BENEFICIAIRE' },
    });
    const lienExistant = await prisma.lienEntrepriseBeneficiaire.findFirst({
      where: { user_id: admin.user_id, entreprise_id: admin.entreprise_id },
    });
    if (walletExistant && lienExistant) continue;

    await prisma.$transaction(async (tx) => {
      if (!walletExistant) {
        await tx.wallet.create({
          data: { user_id: admin.user_id, type: 'BENEFICIAIRE', currency: 'XOF' },
        });
      }
      if (!lienExistant) {
        await tx.lienEntrepriseBeneficiaire.create({
          data: {
            entreprise_id: admin.entreprise_id,
            user_id: admin.user_id,
            niveau: 'CADRE',
            allocation_mensuelle: 8000,
            statut: 'ACTIF',
          },
        });
      }
    });
    completes++;
  }

  console.log(`backfill-wallet-admins: ${completes} compte(s) RH/Directeur complété(s) (wallet + lien bénéficiaire)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
