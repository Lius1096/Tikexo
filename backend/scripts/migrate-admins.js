// Migration : déplace les ADMIN_RH/GESTIONNAIRE_RH de lienEntrepriseBeneficiaire → EntrepriseAdmin
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const liens = await prisma.lienEntrepriseBeneficiaire.findMany({
    where: { user: { role: { in: ['ADMIN_RH', 'GESTIONNAIRE_RH'] } } },
    include: { user: { select: { id: true, role: true, telephone: true } } },
  });

  console.log(`Trouvé ${liens.length} lien(s) RH à migrer`);

  let migres = 0;
  let ignores = 0;

  for (const lien of liens) {
    const existeDeja = await prisma.entrepriseAdmin.findUnique({
      where: { user_id: lien.user_id },
    });

    if (existeDeja) {
      console.log(`  IGNORÉ (déjà migré) : ${lien.user.telephone} → entreprise ${lien.entreprise_id}`);
      ignores++;
      continue;
    }

    // Supprimer les dotations liées (elles sont à 0, créées par erreur lors de l'inscription ADMIN_RH)
    const dotationsCount = await prisma.dotation.count({ where: { lien_id: lien.id } });
    if (dotationsCount > 0) {
      console.log(`  Suppression de ${dotationsCount} dotation(s) à 0 pour le lien RH ${lien.id}`);
      await prisma.dotation.deleteMany({ where: { lien_id: lien.id } });
    }

    await prisma.$transaction([
      prisma.entrepriseAdmin.create({
        data: {
          entreprise_id: lien.entreprise_id,
          user_id: lien.user_id,
          role: lien.user.role,
        },
      }),
      prisma.lienEntrepriseBeneficiaire.delete({ where: { id: lien.id } }),
    ]);

    console.log(`  MIGRÉ : ${lien.user.telephone} (${lien.user.role}) → entreprise ${lien.entreprise_id}`);
    migres++;
  }

  console.log(`\nTerminé — ${migres} migré(s), ${ignores} ignoré(s)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
