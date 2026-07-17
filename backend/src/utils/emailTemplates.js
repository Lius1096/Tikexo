// Templates email TIKEXO — layout unifié + branding
// Tous les emails sortants passent par ces fonctions.

const COULEUR_PRIMAIRE = '#1A3C5E';
const COULEUR_ACCENT   = '#2D9CDB';
const COULEUR_SUCCES   = '#27AE60';
const COULEUR_ALERTE   = '#EB5757';

// ─── Layout de base ──────────────────────────────────────────────────────────

function layout({ titre, corps, bouton, frontendUrl }) {
  const btnHtml = bouton
    ? `<div style="text-align:center;margin:28px 0">
         <a href="${bouton.url}" style="background:${COULEUR_ACCENT};color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block">${bouton.label}</a>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titre}</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 0">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">

        <!-- Header -->
        <tr>
          <td style="background:${COULEUR_PRIMAIRE};padding:28px 32px">
            <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:1px">TIKEXO</span>
            <span style="color:rgba(255,255,255,.5);font-size:12px;margin-left:10px">tikexo.bj</span>
          </td>
        </tr>

        <!-- Corps -->
        <tr>
          <td style="padding:32px">
            <h2 style="margin:0 0 16px;color:${COULEUR_PRIMAIRE};font-size:20px">${titre}</h2>
            ${corps}
            ${btnHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f5f7fa;padding:20px 32px;border-top:1px solid #e8ecf0">
            <p style="margin:0;color:#aaa;font-size:12px;line-height:1.6">
              TIKEXO — Plateforme de titres-repas, Bénin.<br>
              Cet email a été envoyé automatiquement, ne répondez pas directement.<br>
              Pour toute aide : <a href="mailto:support@tikexo.bj" style="color:${COULEUR_ACCENT};text-decoration:none">support@tikexo.bj</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Templates ────────────────────────────────────────────────────────────────

/**
 * PIN oublié — code de réinitialisation
 */
function pinReset(code) {
  const html = layout({
    titre: 'Réinitialisation de votre code PIN',
    corps: `
      <p style="color:#555;margin:0 0 20px">Vous avez demandé à réinitialiser votre code PIN TIKEXO.</p>
      <div style="background:#f0f6ff;border-radius:12px;padding:24px;text-align:center;margin:0 0 20px">
        <p style="margin:0 0 8px;color:#888;font-size:13px">Votre code de réinitialisation</p>
        <span style="font-size:40px;font-weight:700;letter-spacing:10px;color:${COULEUR_PRIMAIRE};font-family:monospace">${code}</span>
      </div>
      <p style="color:#888;font-size:13px;margin:0">Ce code expire dans <strong>5 minutes</strong>.<br>
      Si vous n'avez pas fait cette demande, ignorez cet email — votre compte reste sécurisé.</p>
    `,
  });

  const text = `TIKEXO — Réinitialisation PIN\n\nCode : ${code}\n\nCe code expire dans 5 minutes.\nSi vous n'avez pas fait cette demande, ignorez cet email.`;

  return { html, text };
}

/**
 * Bienvenue — invitation bénéficiaire (lien pour compléter le profil)
 */
function bienvenueBeneficiaire(prenom, entreprise, lienInvitation) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://tikexo.vercel.app';
  const url = lienInvitation || `${frontendUrl}/login`;

  const html = layout({
    titre: `Bienvenue sur TIKEXO, ${prenom} !`,
    corps: `
      <p style="color:#555;margin:0 0 16px">
        <strong>${entreprise}</strong> vous a enregistré(e) sur la plateforme TIKEXO.<br>
        Vos titres-repas digitaux vous attendent.
      </p>
      <div style="background:#f0f7ff;border:1px solid #bdd7f0;border-radius:10px;padding:16px 20px;margin:0 0 20px">
        <p style="color:#1A3C5E;font-weight:600;margin:0 0 8px;font-size:14px">Une seule étape pour accéder à votre espace</p>
        <p style="color:#555;margin:0;font-size:13px">Cliquez sur le bouton ci-dessous pour définir votre email personnel et votre mot de passe. Cela ne prend que 30 secondes.</p>
      </div>
      <ul style="color:#555;padding-left:20px;margin:0 0 20px">
        <li style="margin-bottom:8px">Consultez votre solde et votre carte virtuelle</li>
        <li style="margin-bottom:8px">Payez chez les restaurants partenaires TIKEXO</li>
        <li>Suivez vos transactions en temps réel</li>
      </ul>
      <p style="color:#888;font-size:12px;margin:0">
        Ce lien est valable 7 jours. Des questions ? <a href="mailto:support@tikexo.bj" style="color:${COULEUR_ACCENT}">support@tikexo.bj</a>
      </p>
    `,
    bouton: { url, label: 'Compléter mon profil' },
  });

  const text = `Bienvenue sur TIKEXO, ${prenom} !\n\n${entreprise} vous a enregistré(e).\n\nComplétez votre profil en cliquant sur ce lien :\n${url}\n\nCe lien est valable 7 jours.\nSupport : support@tikexo.bj`;

  return { html, text };
}

/**
 * Invitation d'un RH additionnel (GESTIONNAIRE_RH) par l'ADMIN_RH d'une entreprise
 */
function invitationRh(prenom, entreprise, lienInvitation) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://tikexo.vercel.app';
  const url = lienInvitation || `${frontendUrl}/entreprise/connexion`;

  const html = layout({
    titre: `Vous avez été invité(e) sur TIKEXO, ${prenom} !`,
    corps: `
      <p style="color:#555;margin:0 0 16px">
        Vous avez été invité(e) à rejoindre l'espace RH de <strong>${entreprise}</strong> sur TIKEXO.
      </p>
      <div style="background:#f0f7ff;border:1px solid #bdd7f0;border-radius:10px;padding:16px 20px;margin:0 0 20px">
        <p style="color:#1A3C5E;font-weight:600;margin:0 0 8px;font-size:14px">Une seule étape pour accéder à votre espace</p>
        <p style="color:#555;margin:0;font-size:13px">Cliquez sur le bouton ci-dessous pour définir votre email personnel et votre mot de passe. Cela ne prend que 30 secondes.</p>
      </div>
      <ul style="color:#555;padding-left:20px;margin:0 0 20px">
        <li style="margin-bottom:8px">Gérez les bénéficiaires de l'entreprise</li>
        <li style="margin-bottom:8px">Suivez les dotations et le wallet entreprise</li>
        <li>Toutes vos actions sont tracées et attribuées à votre compte</li>
      </ul>
      <p style="color:#888;font-size:12px;margin:0">
        Ce lien est valable 7 jours. Des questions ? <a href="mailto:support@tikexo.bj" style="color:${COULEUR_ACCENT}">support@tikexo.bj</a>
      </p>
    `,
    bouton: { url, label: 'Compléter mon profil' },
  });

  const text = `Vous avez été invité(e) sur TIKEXO, ${prenom} !\n\n${entreprise} vous invite à rejoindre son espace RH.\n\nComplétez votre profil en cliquant sur ce lien :\n${url}\n\nCe lien est valable 7 jours.\nSupport : support@tikexo.bj`;

  return { html, text };
}

/**
 * Réinitialisation de mot de passe
 */
function resetMotDePasse(prenom, code) {
  const html = layout({
    titre: 'Réinitialisation de votre mot de passe',
    corps: `
      <p style="color:#555;margin:0 0 16px">Bonjour ${prenom},</p>
      <p style="color:#555;margin:0 0 20px">Vous avez demandé à réinitialiser votre mot de passe TIKEXO. Voici votre code :</p>
      <div style="text-align:center;margin:0 0 20px">
        <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1A3C5E;font-family:monospace">${code}</span>
      </div>
      <p style="color:#888;font-size:13px;margin:0 0 8px">Ce code expire dans <strong>10 minutes</strong>.</p>
      <p style="color:#888;font-size:13px;margin:0">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
    `,
  });

  const text = `Réinitialisation de mot de passe TIKEXO\n\nBonjour ${prenom},\n\nVotre code de réinitialisation : ${code}\n\nCe code expire dans 10 minutes.`;

  return { html, text };
}

/**
 * Mutation traitée — changement d'employeur
 */
function mutationTraitee(prenom, ancienneEntreprise, nouvelleEntreprise) {
  const html = layout({
    titre: 'Mise à jour de votre compte TIKEXO',
    corps: `
      <p style="color:#555;margin:0 0 16px">
        Bonjour ${prenom},
      </p>
      <p style="color:#555;margin:0 0 20px">
        Votre compte TIKEXO a été mis à jour suite à votre changement d'employeur.
      </p>
      <div style="background:#f0f6ff;border-radius:10px;padding:18px;margin:0 0 20px">
        <p style="margin:0 0 8px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Ancien employeur</p>
        <p style="margin:0 0 14px;color:${COULEUR_PRIMAIRE};font-weight:600">${ancienneEntreprise}</p>
        <p style="margin:0 0 8px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Nouvel employeur</p>
        <p style="margin:0;color:${COULEUR_SUCCES};font-weight:600">${nouvelleEntreprise}</p>
      </div>
      <p style="color:#888;font-size:13px;margin:0">Votre solde et votre historique sont conservés. Votre PIN reste inchangé.</p>
    `,
  });

  const text = `Bonjour ${prenom},\n\nVotre compte TIKEXO a été mis à jour.\nAncien employeur : ${ancienneEntreprise}\nNouvel employeur : ${nouvelleEntreprise}\n\nVotre solde et votre PIN restent inchangés.`;

  return { html, text };
}

/**
 * Inscription entreprise confirmée
 */
function inscriptionEntrepriseConfirmee(nomEntreprise, nomContact) {
  const html = layout({
    titre: 'Votre espace entreprise est prêt',
    corps: `
      <p style="color:#555;margin:0 0 16px">Bonjour ${nomContact},</p>
      <p style="color:#555;margin:0 0 20px">
        Le compte entreprise <strong>${nomEntreprise}</strong> a été créé avec succès sur TIKEXO.
      </p>
      <p style="color:#555;margin:0 0 16px">Prochaines étapes :</p>
      <ol style="color:#555;padding-left:20px;margin:0 0 20px">
        <li style="margin-bottom:8px">Soumettez vos documents KYB pour activer les dotations</li>
        <li style="margin-bottom:8px">Enregistrez vos employés bénéficiaires</li>
        <li>Effectuez votre premier rechargement de wallet</li>
      </ol>
      <p style="color:#888;font-size:13px;margin:0">
        Besoin d'aide pour démarrer ? <a href="mailto:support@tikexo.bj" style="color:${COULEUR_ACCENT}">support@tikexo.bj</a>
      </p>
    `,
  });

  const text = `Bonjour ${nomContact},\n\nLe compte ${nomEntreprise} est prêt sur TIKEXO.\n\nProchaines étapes :\n1. Soumettre vos documents KYB\n2. Enregistrer vos employés\n3. Effectuer votre premier rechargement\n\nSupport : support@tikexo.bj`;

  return { html, text };
}

/**
 * KYB approuvé — entreprise vérifiée + instructions de première connexion
 */
function kybApprouve(nomEntreprise, nomContact, telephone) {
  const telAffiche = telephone || 'votre numéro enregistré';
  const html = layout({
    titre: 'Votre KYB est approuvé — Activez votre accès RH',
    corps: `
      <p style="color:#555;margin:0 0 16px">Bonjour ${nomContact},</p>
      <div style="background:#f0fdf4;border-left:4px solid ${COULEUR_SUCCES};border-radius:6px;padding:16px;margin:0 0 20px">
        <p style="margin:0;color:${COULEUR_SUCCES};font-weight:600">
          ✓ ${nomEntreprise} est maintenant vérifié sur TIKEXO.
        </p>
      </div>
      <p style="color:#555;margin:0 0 16px">
        Votre accès au portail RH est maintenant actif. Un <strong>code OTP</strong> vient d'être envoyé par SMS au <strong>${telAffiche}</strong> pour votre première connexion.
      </p>
      <p style="color:#555;margin:0 0 8px;font-weight:600">Pour vous connecter :</p>
      <ol style="color:#555;padding-left:20px;margin:0 0 20px">
        <li style="margin-bottom:8px">Rendez-vous sur <a href="https://tikexo.bj/entreprise/connexion" style="color:${COULEUR_ACCENT}">tikexo.bj/entreprise/connexion</a></li>
        <li style="margin-bottom:8px">Entrez votre numéro : <strong>${telAffiche}</strong></li>
        <li style="margin-bottom:8px">Utilisez le code OTP reçu par SMS</li>
        <li>Définissez votre code PIN pour les prochaines connexions</li>
      </ol>
      <p style="color:#555;margin:0 0 16px">
        Vous pouvez maintenant recharger votre wallet et distribuer des dotations à vos salariés.
      </p>
      <p style="color:#888;font-size:13px;margin:0">
        Des questions ? <a href="mailto:support@tikexo.bj" style="color:${COULEUR_ACCENT}">support@tikexo.bj</a>
      </p>
    `,
    bouton: { label: 'Accéder au portail RH', url: 'https://tikexo.bj/entreprise/connexion' },
  });

  const text = `Bonjour ${nomContact},\n\n${nomEntreprise} est maintenant vérifiée sur TIKEXO.\n\nUn code OTP a été envoyé par SMS au ${telAffiche}.\n\nConnectez-vous sur tikexo.bj/entreprise/connexion et définissez votre PIN.\n\nSupport : support@tikexo.bj`;

  return { html, text };
}

/**
 * KYB rejeté — documents insuffisants
 */
function kybRejete(nomEntreprise, nomContact, raison) {
  const html = layout({
    titre: 'Documents KYB à compléter',
    corps: `
      <p style="color:#555;margin:0 0 16px">Bonjour ${nomContact},</p>
      <p style="color:#555;margin:0 0 16px">
        Nous avons examiné le dossier de <strong>${nomEntreprise}</strong> et des informations complémentaires sont nécessaires.
      </p>
      <div style="background:#fff5f5;border-left:4px solid ${COULEUR_ALERTE};border-radius:6px;padding:16px;margin:0 0 20px">
        <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase">Motif</p>
        <p style="margin:0;color:${COULEUR_ALERTE}">${raison}</p>
      </div>
      <p style="color:#555;margin:0 0 16px">
        Veuillez nous faire parvenir les documents manquants à l'adresse suivante :
      </p>
      <p style="margin:0">
        <a href="mailto:kyb@tikexo.bj" style="color:${COULEUR_ACCENT};font-weight:600">kyb@tikexo.bj</a>
      </p>
    `,
  });

  const text = `Bonjour ${nomContact},\n\nDossier KYB de ${nomEntreprise} — documents complémentaires requis.\n\nMotif : ${raison}\n\nEnvoyez les documents manquants à kyb@tikexo.bj`;

  return { html, text };
}

/**
 * Dotation distribuée — notification bénéficiaire
 */
function dotationRecue(prenom, montant, entreprise, devise = 'FCFA') {
  const montantFmt = new Intl.NumberFormat('fr-FR').format(montant);
  const html = layout({
    titre: 'Nouvelle dotation reçue',
    corps: `
      <p style="color:#555;margin:0 0 20px">Bonjour ${prenom},</p>
      <div style="background:#f0fdf4;border-radius:12px;padding:24px;text-align:center;margin:0 0 20px">
        <p style="margin:0 0 6px;color:#888;font-size:13px">${entreprise} vous a crédité</p>
        <span style="font-size:36px;font-weight:700;color:${COULEUR_SUCCES}">${montantFmt} <span style="font-size:18px">${devise}</span></span>
      </div>
      <p style="color:#555;margin:0 0 16px">
        Ce solde est utilisable dans tous les restaurants partenaires TIKEXO au Bénin.
      </p>
      <p style="color:#888;font-size:13px;margin:0">
        Consultez votre solde et votre historique dans l'application TIKEXO.
      </p>
    `,
  });

  const text = `Bonjour ${prenom},\n\n${entreprise} vous a crédité ${montantFmt} ${devise} sur votre wallet TIKEXO.`;

  return { html, text };
}

/**
 * Rechargement wallet entreprise confirmé
 */
function rechargeConfirmee(nomEntreprise, montant, referenceTransaction, devise = 'FCFA') {
  const montantFmt = new Intl.NumberFormat('fr-FR').format(montant);
  const html = layout({
    titre: 'Rechargement confirmé',
    corps: `
      <p style="color:#555;margin:0 0 20px">Le rechargement suivant a bien été enregistré :</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
        <tr style="border-bottom:1px solid #e8ecf0">
          <td style="padding:12px 0;color:#888;font-size:13px">Entreprise</td>
          <td style="padding:12px 0;color:${COULEUR_PRIMAIRE};font-weight:600;text-align:right">${nomEntreprise}</td>
        </tr>
        <tr style="border-bottom:1px solid #e8ecf0">
          <td style="padding:12px 0;color:#888;font-size:13px">Montant</td>
          <td style="padding:12px 0;color:${COULEUR_SUCCES};font-weight:700;text-align:right">${montantFmt} ${devise}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;color:#888;font-size:13px">Référence</td>
          <td style="padding:12px 0;color:${COULEUR_PRIMAIRE};font-family:monospace;text-align:right">${referenceTransaction}</td>
        </tr>
      </table>
      <p style="color:#888;font-size:13px;margin:0">
        Pour toute question : <a href="mailto:facturation@tikexo.bj" style="color:${COULEUR_ACCENT}">facturation@tikexo.bj</a>
      </p>
    `,
  });

  const text = `Rechargement confirmé — ${nomEntreprise}\nMontant : ${montantFmt} ${devise}\nRéférence : ${referenceTransaction}\n\nQuestions : facturation@tikexo.bj`;

  return { html, text };
}

/**
 * Alerte interne — mutation détectée ou incident (destinataire : ops@tikexo.bj)
 */
function alerteInterne(type, details) {
  const html = layout({
    titre: `[ALERTE INTERNE] ${type}`,
    corps: `
      <div style="background:#fff5f5;border-left:4px solid ${COULEUR_ALERTE};border-radius:6px;padding:16px;margin:0 0 16px">
        <p style="margin:0;font-weight:600;color:${COULEUR_ALERTE}">${type}</p>
      </div>
      <pre style="background:#f5f7fa;border-radius:8px;padding:16px;font-size:13px;overflow:auto;white-space:pre-wrap">${JSON.stringify(details, null, 2)}</pre>
    `,
  });

  const text = `[TIKEXO ALERTE INTERNE] ${type}\n\n${JSON.stringify(details, null, 2)}`;

  return { html, text };
}

/**
 * Réactivation de compte bénéficiaire
 */
function reactivationCompte(prenom, entreprise, motDePasse) {
  const html = layout({
    titre: 'Votre compte TIKEXO est réactivé',
    corps: `
      <p style="color:#555;margin:0 0 16px">Bonjour ${prenom},</p>
      <p style="color:#555;margin:0 0 20px">
        <strong>${entreprise}</strong> a réactivé votre accès à la plateforme TIKEXO.
        Vous pouvez vous reconnecter dès maintenant avec les identifiants ci-dessous.
      </p>
      <div style="background:#f0f7ff;border:1px solid #bdd7f0;border-radius:10px;padding:16px 20px;margin:0 0 20px">
        <p style="color:#1A3C5E;font-weight:600;margin:0 0 10px;font-size:14px">Vos identifiants de connexion</p>
        <p style="color:#555;margin:0 0 6px;font-size:13px">📧 <strong>Email :</strong> votre adresse email personnelle</p>
        <p style="color:#555;margin:0;font-size:13px">🔑 <strong>Nouveau mot de passe :</strong> <code style="background:#e8f0fe;padding:2px 8px;border-radius:4px;font-family:monospace;font-size:14px;color:#1A3C5E">${motDePasse}</code></p>
        <p style="color:#888;font-size:11px;margin:10px 0 0">Modifiez ce mot de passe dès votre première connexion.</p>
      </div>
      <p style="color:#888;font-size:13px;margin:0">
        Des questions ? Contactez <a href="mailto:support@tikexo.bj" style="color:${COULEUR_ACCENT}">support@tikexo.bj</a>
      </p>
    `,
    bouton: { url: 'https://tikexo.vercel.app/login', label: 'Se connecter' },
  });

  const text = `Votre compte TIKEXO est réactivé, ${prenom} !\n\n${entreprise} a rétabli votre accès.\n\nNouveau mot de passe : ${motDePasse}\n(Modifiez-le dès votre première connexion)\n\nConnectez-vous sur : https://tikexo.vercel.app/login\n\nSupport : support@tikexo.bj`;

  return { html, text };
}

module.exports = {
  pinReset,
  bienvenueBeneficiaire,
  invitationRh,
  resetMotDePasse,
  reactivationCompte,
  mutationTraitee,
  inscriptionEntrepriseConfirmee,
  kybApprouve,
  kybRejete,
  dotationRecue,
  rechargeConfirmee,
  alerteInterne,
};
