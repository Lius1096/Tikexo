import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scale } from 'lucide-react';
import { RGPD } from '../utils/rgpd';
import { EDITEUR, PROPRIETAIRE, HEBERGEURS } from '../utils/legal';

function getSections() {
  return [
    {
      titre: '1. Éditeur du site',
      contenu: `Le site et l'application TIKEXO sont édités par ${EDITEUR.nom}, ${EDITEUR.forme_juridique} de droit ${EDITEUR.pays === 'France' ? 'français' : EDITEUR.pays}.

Site : ${EDITEUR.site}
Adresse du siège : ${EDITEUR.adresse}
SIRET : ${EDITEUR.siret}
Directeur de la publication : ${EDITEUR.directeur_publication}
Contact : ${EDITEUR.contact}`,
    },
    {
      titre: '2. Propriétaire de la solution',
      contenu: `La solution TIKEXO est la propriété de ${PROPRIETAIRE.nom}, en partenariat avec ${PROPRIETAIRE.partenaire}.

Adresse du siège : ${PROPRIETAIRE.adresse}`,
    },
    {
      titre: '3. Hébergement',
      contenu: HEBERGEURS.map(h => `${h.role} : ${h.nom} — ${h.adresse} (${h.site})`).join('\n'),
    },
    {
      titre: '4. Propriété intellectuelle',
      contenu: `L'ensemble des éléments du site et de l'application TIKEXO (textes, logos, marques, graphismes, code source) sont protégés par le droit de la propriété intellectuelle et demeurent la propriété exclusive de ${EDITEUR.nom} et de ${PROPRIETAIRE.nom}. Toute reproduction ou représentation, totale ou partielle, sans autorisation préalable est interdite.`,
    },
    {
      titre: '5. Données personnelles',
      contenu: `Le traitement des données personnelles des utilisateurs de TIKEXO est décrit dans nos Conditions Générales d'Utilisation et régi par le RGPD. Pour toute question relative à vos données, contactez notre DPO : ${RGPD.contact_dpo}.`,
    },
    {
      titre: '6. Contact',
      contenu: `Pour toute question relative au site ou à l'application, vous pouvez nous contacter à ${RGPD.contact_support}.`,
    },
  ];
}

export default function MentionsLegales() {
  const navigate = useNavigate();
  const sections = getSections();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
            <ArrowLeft size={16} className="text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-[#4F46E5]" />
            <span className="text-[14px] font-semibold text-slate-900">Mentions Légales</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-2xl px-6 py-5">
          <div className="text-[13px] font-bold text-[#4F46E5] mb-1">TIKEXO</div>
          <div className="text-[12px] text-[#4338CA]">
            Plateforme de tickets restaurant numériques
          </div>
        </div>

        {sections.map((s) => (
          <div key={s.titre} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-[13px] font-semibold text-slate-900">{s.titre}</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-line">{s.contenu}</p>
            </div>
          </div>
        ))}

        <div className="text-center pb-8">
          <div className="text-[11px] text-slate-400">
            Questions ? Contactez-nous à{' '}
            <a href={`mailto:${RGPD.contact_dpo}`} className="text-[#4F46E5] underline">{RGPD.contact_dpo}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
