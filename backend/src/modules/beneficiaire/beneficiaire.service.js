// Service bénéficiaire TIKEXO
const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');

const ALLOCATION_PAR_NIVEAU = { EMPLOYE: 5000, CADRE: 8000, MANAGER: 10000, DIRECTEUR: 15000 };
const BCRYPT_ROUNDS = 12;

function genererMotDePasseTemp() {
  return 'Tikexo@' + Math.floor(1000 + Math.random() * 9000);
}
const { validerKYCViaBeneficiaire, cascadeKYCApresDepart } = require('../../utils/kyc');
const { normaliserTelephone } = require('../../utils/telephone');
const { detecterRattachement, traiterSortie: sortieService } = require('../mutation/mutation.service');
const carteUtils = require('../../utils/carte');
const { envoyerEmail, envoyerEmailAsync } = require('../../utils/email');
const { bienvenueBeneficiaire, reactivationCompte } = require('../../utils/emailTemplates');

async function lister(filtres = {}) {
  const { entrepriseId, statut } = filtres;
  const p = parseInt(filtres.page, 10) || 1;
  const l = parseInt(filtres.limit, 10) || 20;
  const where = {};
  if (statut) where.statut = statut;
  if (entrepriseId) {
    where.liensBeneficiaire = { some: { entreprise_id: entrepriseId, statut: 'ACTIF' } };
  }

  const [total, items] = await Promise.all([
    prisma.user.count({ where: { ...where, role: 'BENEFICIAIRE' } }),
    prisma.user.findMany({
      where: { ...where, role: 'BENEFICIAIRE' },
      select: {
        id: true, nom: true, prenom: true, telephone: true,
        email_perso: true, statut: true, kyc_via_entreprise: true,
        wallet: { select: { solde: true, currency: true } },
        liensBeneficiaire: {
          where: { statut: 'ACTIF' },
          include: { entreprise: { select: { id: true, nom: true } } },
        },
      },
      skip: (p - 1) * l,
      take: l,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { items, total, page: p, totalPages: Math.ceil(total / l) };
}

async function creer(data) {
  const telephone = normaliserTelephone(data.telephone);

  // Chercher d'abord par téléphone — transparent pour B (il ne sait pas si l'employé existe déjà)
  const existantTel = await prisma.user.findUnique({ where: { telephone } });
  if (existantTel) return existantTel;

  // Puis par email_perso si fourni
  if (data.email_perso) {
    const existantEmail = await prisma.user.findUnique({ where: { email_perso: data.email_perso } });
    if (existantEmail) return existantEmail;
  }

  const user = await prisma.user.create({
    data: {
      telephone,
      nom: data.nom,
      prenom: data.prenom,
      email_perso: data.email_perso || null,
      email_pro: data.email_pro || null,
      role: 'BENEFICIAIRE',
      statut: 'INACTIF',
    },
  });

  // Créer le wallet bénéficiaire
  await prisma.wallet.create({
    data: {
      user_id: user.id,
      type: 'BENEFICIAIRE',
      currency: 'XOF',
    },
  });

  return user;
}

async function getById(id) {
  return prisma.user.findUniqueOrThrow({
    where: { id },
    select: {
      id: true, nom: true, prenom: true, telephone: true,
      email_perso: true, statut: true, kyc_niveau: true, kyc_via_entreprise: true,
      wallet: true,
      liensBeneficiaire: {
        include: { entreprise: { select: { id: true, nom: true, kyb_valide: true } } },
      },
    },
  });
}

async function modifier(id, data) {
  const { role, entrepriseId, niveau, allocationMensuelle, allocation_mensuelle, ...userFields } = data;

  const user = await prisma.user.update({ where: { id }, data: userFields });

  if (entrepriseId && (niveau || allocationMensuelle)) {
    const lienData = {};
    if (niveau) lienData.niveau = niveau;
    if (allocationMensuelle) lienData.allocation_mensuelle = parseFloat(allocationMensuelle);
    await prisma.lienEntrepriseBeneficiaire.updateMany({
      where: { user_id: id, entreprise_id: entrepriseId, statut: { in: ['ACTIF', 'TERMINE'] } },
      data: lienData,
    });
  }

  return user;
}

async function rattacherEntreprise(userId, { entrepriseId, niveau, allocationMensuelle }, adminId) {
  // Vérifier qu'il n'y a pas déjà un lien ACTIF
  const lienActif = await prisma.lienEntrepriseBeneficiaire.findFirst({
    where: { user_id: userId, entreprise_id: entrepriseId, statut: 'ACTIF' },
  });
  if (lienActif) {
    const err = new Error('Ce bénéficiaire est déjà actif dans cette entreprise');
    err.statusCode = 409;
    throw err;
  }

  // Fetch entreprise pour validation dotation_max + nom (email bienvenue)
  const entreprise = await prisma.entreprise.findUniqueOrThrow({
    where: { id: entrepriseId },
    select: { nom: true, dotation_max: true },
  });

  if (entreprise.dotation_max) {
    const plafond = parseFloat(entreprise.dotation_max.toString());
    const valeur  = parseFloat(allocationMensuelle.toString());
    if (valeur > plafond) {
      const err = new Error(
        `Allocation mensuelle (${valeur.toLocaleString('fr-FR')} XOF) dépasse le plafond de l'entreprise (${Math.floor(plafond).toLocaleString('fr-FR')} XOF)`
      );
      err.statusCode = 400;
      err.code = 'DOTATION_MAX_DEPASSEE';
      throw err;
    }
  }

  // Cas ré-embauche : lien TERMINE existant → réactiver
  const lienTermine = await prisma.lienEntrepriseBeneficiaire.findFirst({
    where: { user_id: userId, entreprise_id: entrepriseId, statut: 'TERMINE' },
  });

  let lien;
  const estPremierRattachement = !lienTermine;
  if (lienTermine) {
    lien = await prisma.$transaction(async (tx) => {
      const updated = await tx.lienEntrepriseBeneficiaire.update({
        where: { id: lienTermine.id },
        data: {
          niveau,
          allocation_mensuelle: allocationMensuelle,
          statut: 'ACTIF',
          date_debut: new Date(),
          date_fin: null,
        },
      });
      if (adminId) {
        await tx.auditLog.create({
          data: {
            user_id: adminId,
            action: 'REEMBAUCHE_EMPLOYE',
            entite: 'LienEntrepriseBeneficiaire',
            entite_id: updated.id,
            apres: { entreprise_id: entrepriseId, niveau, allocation_mensuelle: allocationMensuelle },
          },
        });
      }
      return updated;
    });
  } else {
    lien = await prisma.lienEntrepriseBeneficiaire.create({
      data: {
        entreprise_id: entrepriseId,
        user_id: userId,
        niveau,
        allocation_mensuelle: allocationMensuelle,
        statut: 'ACTIF',
      },
    });
  }

  await validerKYCViaBeneficiaire(prisma, userId, entrepriseId);

  // Émettre automatiquement une carte virtuelle si le bénéficiaire n'en a pas
  const carteExistante = await prisma.carteDigi.findFirst({
    where: { user_id: userId, statut: 'ACTIVE' },
  });

  if (!carteExistante) {
    const { hash, suffixe, numeroMasque } = await carteUtils.genererNumeroCarte(prisma);
    await prisma.carteDigi.create({
      data: {
        user_id       : userId,
        type          : 'VIRTUELLE',
        numero_hash   : hash,
        numero_masque : numeroMasque,
        prefixe       : process.env.CARTE_PREFIXE || '4782',
        suffixe,
        date_expiration: carteUtils.genererDateExpiration(),
        statut        : 'ACTIVE',
      },
    });
  }

  // Détection silencieuse : si cet employé avait une mutation EN_ATTENTE, on la lie à ce nouveau lien
  await detecterRattachement(userId, lien.id, entrepriseId);

  // Email bienvenue — uniquement au premier rattachement (pas ré-embauche)
  if (estPremierRattachement) {
    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
      select: { prenom: true, email_perso: true, mot_de_passe_hash: true },
    });
    if (userInfo?.email_perso) {
      let motDePasseTemp = null;
      if (!userInfo.mot_de_passe_hash) {
        motDePasseTemp = genererMotDePasseTemp();
        const hash = await bcrypt.hash(motDePasseTemp, BCRYPT_ROUNDS);
        await prisma.user.update({ where: { id: userId }, data: { mot_de_passe_hash: hash } });
      }
      const { html, text } = bienvenueBeneficiaire(userInfo.prenom, entreprise.nom, motDePasseTemp);
      envoyerEmail({
        to: userInfo.email_perso,
        subject: `Bienvenue sur TIKEXO — ${entreprise.nom}`,
        html,
        text,
        expediteur: 'hello',
      }).catch(err => console.error('[EMAIL BIENVENUE] Échec envoi vers', userInfo.email_perso, err.message));
    }
  }

  return lien;
}

async function traiterSortie(userId, entrepriseId, adminId, options) {
  return sortieService(userId, entrepriseId, adminId, options);
}

async function suspendre(userId, entrepriseId, adminId) {
  const lien = await prisma.lienEntrepriseBeneficiaire.findFirst({
    where: { user_id: userId, entreprise_id: entrepriseId, statut: 'ACTIF' },
  });
  if (!lien) {
    const err = new Error('Bénéficiaire non rattaché à cette entreprise');
    err.statusCode = 404;
    throw err;
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { statut: 'BLOQUE' },
    select: { id: true, nom: true, prenom: true, statut: true },
  });
  if (adminId) {
    await prisma.auditLog.create({
      data: {
        user_id: adminId,
        action: 'SUSPENSION_BENEFICIAIRE',
        entite: 'User',
        entite_id: userId,
        apres: { statut: 'BLOQUE', entreprise_id: entrepriseId },
      },
    });
  }
  return user;
}

async function reactiver(userId, entrepriseId, adminId) {
  const lien = await prisma.lienEntrepriseBeneficiaire.findFirst({
    where: { user_id: userId, entreprise_id: entrepriseId, statut: { in: ['ACTIF', 'TERMINE'] } },
  });
  if (!lien) {
    const err = new Error('Bénéficiaire non rattaché à cette entreprise');
    err.statusCode = 404;
    throw err;
  }

  // Générer un nouveau mot de passe temporaire avant la mise à jour
  const motDePasseTemp = genererMotDePasseTemp();
  const hash = await bcrypt.hash(motDePasseTemp, BCRYPT_ROUNDS);

  // Si l'employé est sorti (TERMINE), remettre le lien à ACTIF
  if (lien.statut === 'TERMINE') {
    await prisma.lienEntrepriseBeneficiaire.update({
      where: { id: lien.id },
      data: { statut: 'ACTIF' },
    });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { statut: 'ACTIF', mot_de_passe_hash: hash },
    select: { id: true, nom: true, prenom: true, statut: true, email_perso: true },
  });

  if (adminId) {
    await prisma.auditLog.create({
      data: {
        user_id: adminId,
        action: 'REACTIVATION_BENEFICIAIRE',
        entite: 'User',
        entite_id: userId,
        apres: { statut: 'ACTIF', entreprise_id: entrepriseId },
      },
    });
  }

  // Email de réactivation avec nouveau mot de passe
  if (user.email_perso) {
    const entreprise = await prisma.entreprise.findUnique({
      where: { id: entrepriseId },
      select: { nom: true },
    });
    const { html, text } = reactivationCompte(user.prenom, entreprise?.nom ?? 'votre entreprise', motDePasseTemp);
    envoyerEmail({
      to: user.email_perso,
      subject: 'Votre compte TIKEXO a été réactivé',
      html,
      text,
      expediteur: 'hello',
    }).catch(err => console.error('[EMAIL REACTIVATION] Échec envoi vers', user.email_perso, err.message));
  } else {
    console.warn('[EMAIL REACTIVATION] Pas d\'email_perso pour userId', userId);
  }

  return user;
}

async function importerEnMasse(entrepriseId, rows, adminId) {
  const resultats = [];

  for (const row of rows) {
    const telephone = (row.telephone || '').replace(/\D/g, '');
    const prenom = (row.prenom || '').trim();
    const nom    = (row.nom    || '').trim();

    if (!prenom || !nom) {
      resultats.push({ prenom, nom, telephone, statut: 'ERREUR', message: 'Prénom et nom requis' });
      continue;
    }
    if (!telephone || (telephone.length !== 8 && telephone.length !== 10)) {
      resultats.push({ prenom, nom, telephone, statut: 'ERREUR', message: 'Numéro de téléphone invalide (8 ou 10 chiffres)' });
      continue;
    }

    try {
      const user = await creer({
        prenom, nom, telephone,
        email_perso: row.email?.trim() || undefined,
      });

      const niveauBrut = (row.niveau || '').toUpperCase().trim();
      const niveau = ['EMPLOYE', 'CADRE', 'MANAGER', 'DIRECTEUR'].includes(niveauBrut) ? niveauBrut : 'EMPLOYE';

      await rattacherEntreprise(user.id, {
        entrepriseId,
        niveau,
        allocationMensuelle: parseFloat(row.valeur_repas) || ALLOCATION_PAR_NIVEAU[niveau] || 5000,
      }, adminId);

      resultats.push({ prenom: user.prenom, nom: user.nom, telephone: user.telephone, statut: 'OK', message: 'Importé avec succès' });
    } catch (err) {
      resultats.push({
        prenom, nom, telephone,
        statut: err.statusCode === 409 ? 'IGNORE' : 'ERREUR',
        message: err.message || 'Erreur inconnue',
      });
    }
  }

  return {
    resultats,
    ok:      resultats.filter((r) => r.statut === 'OK').length,
    ignores: resultats.filter((r) => r.statut === 'IGNORE').length,
    erreurs: resultats.filter((r) => r.statut === 'ERREUR').length,
  };
}

module.exports = { lister, creer, getById, modifier, rattacherEntreprise, traiterSortie, suspendre, reactiver, importerEnMasse };
