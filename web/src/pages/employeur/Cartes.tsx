import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { CreditCard, Lock, Unlock, X, ChevronRight, MapPin, Send } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { CarteVirtuelle, type CarteData } from '../../components/CarteVisuelle';
import { fmtDate } from '../../utils/format';

const niveauLabel: Record<string, string> = {
  EMPLOYE: 'Employé', CADRE: 'Cadre', MANAGER: 'Manager',
  DIRECTEUR: 'Directeur', AGENT_MAITRISE: 'Agent maîtrise', STAGIAIRE: 'Stagiaire',
};

const statutBadge: Record<string, string> = {
  ACTIVE:  'bg-[#EAF3DE] text-[#3B6D11]',
  BLOQUEE: 'bg-[#FCEBEB] text-[#A32D2D]',
  EXPIREE: 'bg-[#F1F5F9] text-[#64748B]',
  PERDUE:  'bg-[#FEF3C7] text-[#92400E]',
};

const PALETTE = [
  ['#DBEAFE', '#185FA5'], ['#EAF3DE', '#3B6D11'],
  ['#FAEEDA', '#854F0B'], ['#FCEBEB', '#A32D2D'],
];

interface BenefCartes {
  lien_id : string;
  niveau  : string;
  user    : { id: string; nom: string; prenom: string; telephone: string };
  carte   : CarteData | null;
}

export default function EmployeurCartes() {
  const { user } = useAuth();
  const entrepriseId = (user as any)?.entrepriseId;
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cartes-entreprise', entrepriseId],
    queryFn : () => api.get(`/cartes?entrepriseId=${entrepriseId}`).then((r) => r.data.data),
    enabled : !!entrepriseId,
  });

  const items: BenefCartes[] = data || [];
  const selected = items.find((b) => b.lien_id === selectedId) ?? null;
  const invalidate = () => qc.invalidateQueries({ queryKey: ['cartes-entreprise', entrepriseId] });

  const bloquer = useMutation({
    mutationFn: (carteId: string) => api.post(`/cartes/${carteId}/bloquer`),
    onSuccess : () => { setActionError(null); invalidate(); },
    onError   : (e: any) => setActionError(e?.response?.data?.error ?? 'Erreur blocage.'),
  });

  const debloquer = useMutation({
    mutationFn: (carteId: string) => api.post(`/cartes/${carteId}/debloquer`),
    onSuccess : () => { setActionError(null); invalidate(); },
    onError   : (e: any) => setActionError(e?.response?.data?.error ?? 'Erreur déblocage.'),
  });

  const isPending = bloquer.isPending || debloquer.isPending;

  const totalActives  = items.filter((b) => b.carte?.statut === 'ACTIVE').length;
  const totalBloquees = items.filter((b) => b.carte?.statut === 'BLOQUEE').length;
  const sansCartes    = items.filter((b) => !b.carte).length;

  if (!entrepriseId) {
    return <div className="p-6 text-center text-sm text-slate-500">Profil non rattaché à une entreprise.</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <div className="text-[15px] font-medium text-slate-900">Cartes TIKEXO</div>
        <div className="text-xs text-slate-500">Cartes virtuelles des bénéficiaires</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Actives',    value: totalActives,  color: 'text-[#3B6D11]', bg: 'bg-[#EAF3DE]' },
          { label: 'Bloquées',   value: totalBloquees, color: 'text-[#A32D2D]', bg: 'bg-[#FCEBEB]' },
          { label: 'Sans carte', value: sansCartes,    color: 'text-[#854F0B]', bg: 'bg-[#FAEEDA]' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3">
            <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
              <CreditCard size={14} className={color} />
            </div>
            <div>
              <div className={clsx('text-lg font-semibold', color)}>{value}</div>
              <div className="text-[10px] text-slate-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {actionError && (
        <div className="mb-3 px-4 py-2.5 rounded-xl bg-[#FCEBEB] border border-[#F4B8B8] text-sm text-[#991B1B]">
          {actionError}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              {['BÉNÉFICIAIRE', 'NIVEAU', 'NUMÉRO', 'TYPE', 'EXPIRE', 'STATUT', ''].map((h) => (
                <th key={h} className="text-[10px] text-slate-400 text-left px-4 py-3 font-normal tracking-[0.5px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-slate-100 animate-pulse rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <CreditCard size={24} className="text-slate-200 mx-auto mb-2" />
                  <div className="text-sm text-slate-400">Aucun bénéficiaire</div>
                </td>
              </tr>
            ) : (
              items.map((b, idx) => {
                const [bg, fg] = PALETTE[idx % PALETTE.length];
                const initials = `${b.user.prenom[0] ?? ''}${b.user.nom[0] ?? ''}`.toUpperCase();
                const c = b.carte;

                return (
                  <tr
                    key={b.lien_id}
                    onClick={() => setSelectedId(b.lien_id === selectedId ? null : b.lien_id)}
                    className={clsx(
                      'border-b border-slate-50 last:border-0 cursor-pointer transition-colors',
                      selectedId === b.lien_id ? 'bg-blue-50/30' : 'hover:bg-slate-50/60'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0"
                          style={{ background: bg, color: fg }}>
                          {initials}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-900">{b.user.prenom} {b.user.nom}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{b.user.telephone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                        {niveauLabel[b.niveau] ?? b.niveau}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {c ? c.numero_masque : <span className="text-slate-300 italic text-[11px]">Non émise</span>}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {c ? (c.type === 'VIRTUELLE' ? 'Virtuelle' : 'Physique') : '—'}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {c ? fmtDate(c.date_expiration) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {c ? (
                        <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium', statutBadge[c.statut])}>
                          {c.statut === 'ACTIVE' ? 'Active' : c.statut === 'BLOQUEE' ? 'Bloquée'
                            : c.statut === 'EXPIREE' ? 'Expirée' : 'Perdue'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight size={14} className={clsx('text-slate-300 transition-transform', selectedId === b.lien_id && 'rotate-90')} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {selected && (
        <CarteDrawer
          benef={selected}
          onClose={() => setSelectedId(null)}
          onBloquer={(id) => bloquer.mutate(id)}
          onDebloquer={(id) => debloquer.mutate(id)}
          isPending={isPending}
        />
      )}
    </div>
  );
}

// ─── Drawer détail carte ───────────────────────────────────────────────────────

function CarteDrawer({ benef, onClose, onBloquer, onDebloquer, isPending }: {
  benef     : BenefCartes;
  onClose   : () => void;
  onBloquer : (id: string) => void;
  onDebloquer: (id: string) => void;
  isPending : boolean;
}) {
  const qc = useQueryClient();
  const u = benef.user;
  const initials = `${u.prenom[0] ?? ''}${u.nom[0] ?? ''}`.toUpperCase();
  const c = benef.carte;

  const [showDemandePhysique, setShowDemandePhysique] = useState(false);
  const [adresse, setAdresse] = useState('');

  const demanderPhysiqueMut = useMutation({
    mutationFn: () => api.post(`/cartes/physique/demande/${u.id}`, { adresse_livraison: adresse }),
    onSuccess : () => {
      qc.invalidateQueries({ queryKey: ['cartes-entreprise'] });
      setShowDemandePhysique(false);
      setAdresse('');
    },
  });

  const peutDemanderPhysique = c?.type === 'VIRTUELLE' && c?.statut === 'ACTIVE';
  const aDejaDemandePhysique = c?.statut === 'COMMANDE' || c?.type === 'PHYSIQUE';

  // On injecte les infos user dans la carte pour affichage sur la carte visuelle
  const carteAvecUser: CarteData | null = c ? {
    ...c,
    user: { nom: u.nom, prenom: u.prenom },
  } : null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[400px] bg-white shadow-2xl border-l border-slate-100 flex flex-col h-full">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[13px] font-medium text-[#185FA5]">
              {initials}
            </div>
            <div>
              <div className="text-[13px] font-medium text-slate-900">{u.prenom} {u.nom}</div>
              <div className="text-[11px] text-slate-400 font-mono">{u.telephone}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 px-5 py-5 space-y-5 overflow-y-auto">

          {/* Carte visuelle */}
          {carteAvecUser ? (
            <div>
              <div className="text-[10px] text-slate-400 tracking-[0.5px] uppercase mb-3">Carte active</div>
              {/* Scale 0.97 pour tenir dans 400px de drawer (340 * 1.0 = 340, ok) */}
              <div style={{ width: 340 }}>
                <CarteVirtuelle carte={carteAvecUser} />
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
              <CreditCard size={28} className="text-slate-200" />
              <div className="text-sm font-medium text-slate-500">Aucune carte émise</div>
              <div className="text-[11px] text-slate-400">La carte virtuelle est créée par TIKEXO Ops</div>
            </div>
          )}

          {/* Infos */}
          {c && (
            <div className="bg-slate-50 rounded-xl divide-y divide-white">
              {[
                { label: 'Numéro',    value: c.numero_masque,  mono: true },
                { label: 'Type',      value: c.type === 'VIRTUELLE' ? 'Carte virtuelle' : 'Carte physique' },
                { label: 'Expire',    value: fmtDate(c.date_expiration) },
                { label: 'NFC',       value: c.nfc_active ? 'Activé' : 'Désactivé' },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-[11px] text-slate-400">{label}</span>
                  <span className={clsx('text-[11px] text-slate-700', mono && 'font-mono')}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {c && (
            <div className="space-y-2">
              <div className="text-[10px] text-slate-400 tracking-[0.5px] uppercase mb-2">Actions</div>

              {/* Demander carte physique */}
              {peutDemanderPhysique && !showDemandePhysique && (
                <button
                  onClick={() => setShowDemandePhysique(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[#BFDBFE] bg-[#DBEAFE] text-[#185FA5] text-sm hover:bg-[#BFDBFE] transition-colors"
                >
                  <Send size={15} />
                  <div className="text-left">
                    <div className="font-medium text-sm">Demander carte physique</div>
                    <div className="text-[10px] text-[#185FA5]/70">NFC · EMV · Traitement TIKEXO Ops</div>
                  </div>
                </button>
              )}

              {/* Formulaire adresse livraison */}
              {showDemandePhysique && (
                <div className="bg-[#F0F6FF] border border-[#BFDBFE] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-[#185FA5]" />
                    <span className="text-[12px] font-medium text-[#185FA5]">Adresse de livraison</span>
                  </div>
                  <textarea
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    placeholder="Ex: Quartier Fidjrossè, Rue des Cocotiers, Cotonou…"
                    rows={3}
                    className="w-full text-xs border border-[#BFDBFE] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1A3B8C] resize-none bg-white"
                  />
                  {demanderPhysiqueMut.isError && (
                    <p className="text-[11px] text-red-500">
                      {(demanderPhysiqueMut.error as any)?.response?.data?.error ?? 'Erreur lors de la demande'}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => demanderPhysiqueMut.mutate()}
                      disabled={!adresse.trim() || demanderPhysiqueMut.isPending}
                      className="flex-1 bg-[#1A3B8C] text-white text-xs font-medium py-2 rounded-lg disabled:opacity-50 hover:bg-[#15306e] transition-colors"
                    >
                      {demanderPhysiqueMut.isPending ? 'Envoi…' : 'Soumettre la demande'}
                    </button>
                    <button
                      onClick={() => { setShowDemandePhysique(false); setAdresse(''); }}
                      className="px-3 text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Demande déjà en cours */}
              {aDejaDemandePhysique && c.type !== 'PHYSIQUE' && (
                <div className="bg-[#FEF9C3] border border-[#FDE68A] rounded-xl px-4 py-3 text-[11px] text-[#854D0E]">
                  Une demande de carte physique est déjà en cours de traitement par TIKEXO Ops.
                </div>
              )}

              {c.statut === 'ACTIVE' && (
                <button
                  onClick={() => onBloquer(c.id)}
                  disabled={isPending}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <Lock size={15} />
                  <div className="text-left">
                    <div className="font-medium text-sm">Bloquer la carte</div>
                    <div className="text-[10px] text-red-400">Le bénéficiaire ne pourra plus payer</div>
                  </div>
                </button>
              )}
              {c.statut === 'BLOQUEE' && (
                <button
                  onClick={() => onDebloquer(c.id)}
                  disabled={isPending}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  <Unlock size={15} />
                  <div className="text-left">
                    <div className="font-medium text-sm">Débloquer la carte</div>
                    <div className="text-[10px] text-green-500">Réactive les paiements</div>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
