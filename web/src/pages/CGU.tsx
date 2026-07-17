import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const SECTIONS = [
  {
    titre: '1. Objet et champ d\'application',
    contenu: `Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme TIKEXO, service de tickets restaurant numériques édité et exploité par TIKEXO SAS, opérant en République du Bénin.

En créant ou en utilisant un compte TIKEXO, vous acceptez sans réserve les présentes CGU ainsi que notre Politique de confidentialité. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser le service.`,
  },
  {
    titre: '2. Description du service',
    contenu: `TIKEXO est une plateforme SaaS de gestion de tickets restaurant numériques permettant :
• Aux employeurs (entreprises) d'attribuer des allocations repas mensuelles à leurs salariés.
• Aux bénéficiaires (salariés) de régler leurs repas chez les commerçants partenaires via wallet numérique, carte virtuelle ou QR code.
• Aux commerçants partenaires d'accepter les paiements TIKEXO.

TIKEXO n'est pas un établissement bancaire. Le wallet TIKEXO est un compte de monnaie électronique prépayé à usage limité (repas).`,
  },
  {
    titre: '3. Création de compte et responsabilités',
    contenu: `3.1. Employeur : L'entreprise s'engage à ne renseigner que des employés ayant un contrat de travail en cours et ayant consenti à l'utilisation de TIKEXO.

3.2. Bénéficiaire : L'employé reçoit un lien d'invitation sur son email professionnel. En complétant son profil (email personnel + mot de passe), il crée son compte TIKEXO et accepte les présentes CGU.

3.3. Sécurité : Chaque utilisateur est responsable de la confidentialité de ses identifiants. Tout usage frauduleux doit être signalé immédiatement à support@tikexo.bj.`,
  },
  {
    titre: '4. Données personnelles et RGPD',
    contenu: `TIKEXO collecte et traite vos données personnelles dans le cadre de la fourniture du service.

Données collectées : nom, prénom, numéro de téléphone, email professionnel, email personnel, données de transactions (montant, date, commerçant).

Bases légales du traitement :
• Exécution du contrat (Art. 6(1)(b) RGPD) pour la gestion du compte et des paiements.
• Obligation légale (Art. 6(1)(c) RGPD) pour la conservation des données financières conformément à la réglementation UEMOA et aux obligations LCB-FT (Lutte Contre le Blanchiment et le Financement du Terrorisme).

Durées de conservation :
• Données personnelles identifiantes : 3 ans après la clôture du compte.
• Données financières (transactions, mouvements de wallet) : 5 ans minimum, conformément à la réglementation UEMOA et BCEAO.
• Logs d'audit de sécurité : conservés indéfiniment pour la lutte anti-fraude.

Vos droits (Art. 15 à 22 RGPD) :
• Droit d'accès et de portabilité : téléchargez vos données depuis votre profil TIKEXO.
• Droit de rectification : contactez support@tikexo.bj.
• Droit à l'effacement : applicable aux données personnelles identifiantes. Les données financières ne peuvent être supprimées avant l'expiration du délai légal de conservation.
• Droit d'opposition : pour les traitements fondés sur l'intérêt légitime.

Contact DPO (Délégué à la Protection des Données) : rgpd@tikexo.bj`,
  },
  {
    titre: '5. Utilisation du wallet et des fonds',
    contenu: `5.1. Le solde TIKEXO est crédité exclusivement par l'employeur et ne peut être utilisé que chez les commerçants partenaires TIKEXO pour le règlement de repas.

5.2. Le solde non dépensé est conservé 90 jours après la fin du contrat de travail, puis remboursé à l'employeur selon les conditions contractuelles.

5.3. En cas de clôture de compte TIKEXO, tout solde résiduel doit être dépensé avant la clôture. TIKEXO ne procède pas au remboursement en espèces ou virement du solde bénéficiaire sans accord de l'employeur.`,
  },
  {
    titre: '6. Fin de la relation de travail',
    contenu: `6.1. Sortie normale : à la fin du contrat de travail, l'employeur procède à la "Sortie de l'entreprise" depuis son espace TIKEXO. L'accès du salarié est suspendu dans un délai de 24 heures.

6.2. Exclusion définitive : en cas de faute grave, l'employeur peut exclure définitivement un salarié. Cette action bloque toute ré-embauche via TIKEXO dans la même entreprise.

6.3. Le salarié sorti peut exercer son droit à la clôture de compte depuis son profil TIKEXO.`,
  },
  {
    titre: '7. Responsabilité et limitation',
    contenu: `TIKEXO ne peut être tenu responsable des interruptions de service dues à des maintenances, incidents techniques ou cas de force majeure. La responsabilité de TIKEXO est limitée aux montants versés par l'utilisateur sur les 12 derniers mois.

TIKEXO se réserve le droit de suspendre tout compte en cas de suspicion de fraude, d'utilisation abusive ou de violation des présentes CGU.`,
  },
  {
    titre: '8. Modification des CGU',
    contenu: `TIKEXO peut modifier les présentes CGU à tout moment. Les utilisateurs seront informés par email au moins 30 jours avant l'entrée en vigueur des nouvelles conditions. L'utilisation continue du service après cette date vaut acceptation des nouvelles CGU.`,
  },
  {
    titre: '9. Droit applicable et juridiction',
    contenu: `Les présentes CGU sont régies par le droit béninois. Tout litige relatif à leur interprétation ou exécution sera soumis aux juridictions compétentes de Cotonou, République du Bénin.

Pour toute question : support@tikexo.bj
DPO / RGPD : rgpd@tikexo.bj`,
  },
];

export default function CGU() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
            <ArrowLeft size={16} className="text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#4F46E5]" />
            <span className="text-[14px] font-semibold text-slate-900">Conditions Générales d'Utilisation</span>
          </div>
          <div className="ml-auto text-[10px] text-slate-400">Version du 17 juillet 2026</div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Intro */}
        <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-2xl px-6 py-5">
          <div className="text-[13px] font-bold text-[#4F46E5] mb-1">TIKEXO</div>
          <div className="text-[12px] text-[#4338CA]">
            Plateforme de tickets restaurant numériques — République du Bénin
          </div>
          <div className="text-[11px] text-[#6366F1] mt-2">
            En utilisant TIKEXO, vous acceptez ces conditions ainsi que notre politique de traitement des données personnelles conformément au RGPD et à la loi béninoise n°2017-20 portant Code du Numérique.
          </div>
        </div>

        {/* Sections */}
        {SECTIONS.map((s) => (
          <div key={s.titre} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-[13px] font-semibold text-slate-900">{s.titre}</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-line">{s.contenu}</p>
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="text-center pb-8">
          <div className="text-[11px] text-slate-400">
            Questions ? Contactez-nous à{' '}
            <a href="mailto:rgpd@tikexo.bj" className="text-[#4F46E5] underline">rgpd@tikexo.bj</a>
          </div>
        </div>
      </div>
    </div>
  );
}
