import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Wallet, ArrowDown, ArrowUp, Plus, X, Phone, ExternalLink, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const OPERATEURS = [
  { label: 'MTN Bénin', prefixes: ['96', '97', '98', '99'], color: '#F59E0B' },
  { label: 'Moov Africa', prefixes: ['95', '94', '93', '92'], color: '#0EA5E9' },
  { label: 'Celtis / SBIN', prefixes: ['61', '62', '63', '64', '65', '66'], color: '#8B5CF6' },
];

function detecterOperateur(tel: string): string | null {
  const prefix = tel.replace(/\D/g, '').slice(0, 2);
  const op = OPERATEURS.find((o) => o.prefixes.includes(prefix));
  return op ? op.label : null;
}

function formatMontant(val: string): string {
  const num = val.replace(/\D/g, '');
  return num ? parseInt(num, 10).toLocaleString('fr-FR') : '';
}

interface RechargeModal {
  open: boolean;
  montant: string;
  telephone: string;
  etape: 'formulaire' | 'confirmation' | 'succes';
  paymentUrl: string | null;
  isMock: boolean;
  erreur: string | null;
}

export default function EmployeurWallet() {
  const { user } = useAuth();
  const entrepriseId = user?.entrepriseId;
  const queryClient = useQueryClient();

  const [modal, setModal] = useState<RechargeModal>({
    open: false,
    montant: '',
    telephone: '',
    etape: 'formulaire',
    paymentUrl: null,
    isMock: false,
    erreur: null,
  });

  const { data: wallet, isLoading } = useQuery({
    queryKey: ['wallet-entreprise', entrepriseId],
    queryFn: () => api.get(`/entreprises/${entrepriseId}/wallet`).then((r) => r.data.data),
    enabled: !!entrepriseId,
  });

  const rechargeMutation = useMutation({
    mutationFn: (body: { entrepriseId: string; montant: number; telephonePayeur: string }) =>
      api.post('/wallet/recharger', body).then((r) => r.data.data),
    onSuccess: (data) => {
      setModal((m) => ({ ...m, etape: 'succes', paymentUrl: data.payment_url, isMock: !!data.mock, erreur: null }));
      queryClient.invalidateQueries({ queryKey: ['wallet-entreprise', entrepriseId] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erreur lors de la création du lien de paiement.';
      setModal((m) => ({ ...m, erreur: msg }));
    },
  });

  const solde = Number(wallet?.solde || 0);
  const soldeReserve = Number(wallet?.solde_reserve || 0);
  const entries = wallet?.ledgerSorties || [];

  const montantNum = parseInt(modal.montant.replace(/\D/g, ''), 10) || 0;
  const operateur = detecterOperateur(modal.telephone);
  const telValide = /^\d{8}$/.test(modal.telephone.replace(/\D/g, ''));
  const montantValide = montantNum >= 1000;
  const formulaireValide = montantValide && telValide;

  function ouvrirModal() {
    setModal({ open: true, montant: '', telephone: '', etape: 'formulaire', paymentUrl: null, isMock: false, erreur: null });
  }

  function fermerModal() {
    setModal((m) => ({ ...m, open: false }));
  }

  function handleMontantChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '');
    setModal((m) => ({ ...m, montant: raw, erreur: null }));
  }

  function handleTelChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    setModal((m) => ({ ...m, telephone: raw, erreur: null }));
  }

  function handleConfirmer() {
    setModal((m) => ({ ...m, etape: 'confirmation' }));
  }

  function handlePayer() {
    if (!entrepriseId) return;
    rechargeMutation.mutate({
      entrepriseId,
      montant: montantNum,
      telephonePayeur: modal.telephone,
    });
  }

  if (!entrepriseId) {
    return (
      <div className="p-6 text-center text-sm text-slate-500">
        Profil non rattaché à une entreprise. Contactez un administrateur TIKEXO.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[15px] font-medium text-slate-900">Wallet entreprise</div>
        <button
          onClick={ouvrirModal}
          className="flex items-center gap-1.5 bg-tikexo-primary text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-tikexo-primary/90 transition-colors"
        >
          <Plus size={14} />
          Recharger le wallet
        </button>
      </div>

      <div className="bg-tikexo-primary rounded-xl px-6 py-5 mb-5 text-white">
        <div className="text-xs text-white/50 mb-1">Solde total</div>
        <div className="font-mono text-[32px] font-medium">
          {isLoading ? '…' : solde.toLocaleString('fr-FR')} XOF
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
          <div>
            <div className="text-[11px] text-white/50">Disponible</div>
            <div className="font-mono text-base font-medium text-tikexo-accent">
              {(solde - soldeReserve).toLocaleString('fr-FR')} XOF
            </div>
          </div>
          <div>
            <div className="text-[11px] text-white/50">Réservé (dotations)</div>
            <div className="font-mono text-base font-medium text-tikexo-gold">
              {soldeReserve.toLocaleString('fr-FR')} XOF
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-lg">
        <div className="px-4 py-3.5 border-b border-slate-100">
          <div className="text-[13px] font-medium text-slate-900 flex items-center gap-1.5">
            <Wallet size={14} className="text-slate-400" />
            Derniers mouvements
          </div>
        </div>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-slate-400">Chargement…</div>
        ) : entries.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">Aucun mouvement</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.map((e: { id: string; type: string; montant: string; createdAt: string; wallet_source_id?: string }) => {
              const isDebit = !!e.wallet_source_id;
              return (
                <div key={e.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      isDebit ? 'bg-[#FCEBEB]' : 'bg-[#EAF3DE]'
                    )}>
                      {isDebit
                        ? <ArrowUp size={14} className="text-[#A32D2D]" />
                        : <ArrowDown size={14} className="text-[#3B6D11]" />}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-900">{e.type.replace(/_/g, ' ')}</div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(e.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                  <div className={clsx(
                    'font-mono text-sm font-medium',
                    isDebit ? 'text-[#A32D2D]' : 'text-[#3B6D11]'
                  )}>
                    {isDebit ? '−' : '+'}{Number(e.montant).toLocaleString('fr-FR')} XOF
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal rechargement */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <div className="text-[13px] font-medium text-slate-900">
                  {modal.etape === 'succes'
                    ? modal.isMock ? 'Wallet rechargé' : 'Lien de paiement créé'
                    : 'Recharger le wallet'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {modal.etape === 'formulaire' && 'Via Mobile Money — MTN · Moov · Celtis'}
                  {modal.etape === 'confirmation' && 'Vérifiez les informations avant de payer'}
                  {modal.etape === 'succes' && !modal.isMock && 'Cliquez sur le lien pour finaliser le paiement'}
                </div>
              </div>
              <button onClick={fermerModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            {/* Contenu formulaire */}
            {modal.etape === 'formulaire' && (
              <div className="px-5 py-5 space-y-4">
                {/* Montant */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Montant à recharger
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatMontant(modal.montant)}
                      onChange={handleMontantChange}
                      placeholder="ex : 100 000"
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 pr-16 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-tikexo-primary/30 focus:border-tikexo-primary"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">XOF</span>
                  </div>
                  {modal.montant && !montantValide && (
                    <p className="text-[11px] text-red-500 mt-1">Montant minimum : 1 000 XOF</p>
                  )}
                </div>

                {/* Montants suggérés */}
                <div className="flex gap-2 flex-wrap">
                  {[10000, 25000, 50000, 100000, 250000].map((v) => (
                    <button
                      key={v}
                      onClick={() => setModal((m) => ({ ...m, montant: String(v) }))}
                      className={clsx(
                        'text-[11px] font-medium px-3 py-1.5 rounded-full border transition-colors',
                        montantNum === v
                          ? 'bg-tikexo-primary text-white border-tikexo-primary'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-tikexo-primary'
                      )}
                    >
                      {v.toLocaleString('fr-FR')}
                    </button>
                  ))}
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Numéro Mobile Money
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={modal.telephone}
                      onChange={handleTelChange}
                      placeholder="ex : 97000000"
                      maxLength={8}
                      className="w-full border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-tikexo-primary/30 focus:border-tikexo-primary"
                    />
                  </div>
                  {modal.telephone && operateur && (
                    <p className="text-[11px] text-tikexo-accent mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-tikexo-accent inline-block"></span>
                      {operateur} détecté
                    </p>
                  )}
                  {modal.telephone.length >= 2 && !operateur && (
                    <p className="text-[11px] text-slate-400 mt-1">MTN : 96-99 · Moov : 92-95 · Celtis : 61-66</p>
                  )}
                </div>

                {modal.erreur && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                    <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-600">{modal.erreur}</p>
                  </div>
                )}

                <button
                  onClick={handleConfirmer}
                  disabled={!formulaireValide}
                  className="w-full bg-tikexo-primary text-white text-sm font-medium py-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-tikexo-primary/90 transition-colors"
                >
                  Continuer
                </button>
              </div>
            )}

            {/* Confirmation */}
            {modal.etape === 'confirmation' && (
              <div className="px-5 py-5 space-y-4">
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Montant</span>
                    <span className="font-mono text-sm font-medium text-slate-900">{montantNum.toLocaleString('fr-FR')} XOF</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Numéro Mobile Money</span>
                    <span className="font-mono text-sm font-medium text-slate-900">{modal.telephone}</span>
                  </div>
                  {operateur && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Opérateur</span>
                      <span className="text-xs font-medium text-tikexo-accent">{operateur}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                    <span className="text-xs text-slate-500">Solde après rechargement</span>
                    <span className="font-mono text-sm font-medium text-[#3B6D11]">
                      {(solde + montantNum).toLocaleString('fr-FR')} XOF
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Une demande de paiement FedaPay va être créée. Vous serez redirigé vers la page de paiement Mobile Money.
                </p>

                {modal.erreur && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                    <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-600">{modal.erreur}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setModal((m) => ({ ...m, etape: 'formulaire' }))}
                    className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={handlePayer}
                    disabled={rechargeMutation.isPending}
                    className="flex-1 bg-tikexo-primary text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-60 hover:bg-tikexo-primary/90 transition-colors"
                  >
                    {rechargeMutation.isPending ? 'Création…' : 'Payer via Mobile Money'}
                  </button>
                </div>
              </div>
            )}

            {/* Succès */}
            {modal.etape === 'succes' && (
              <div className="px-5 py-5 space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-[#EAF3DE] rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="#3B6D11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  {modal.isMock ? (
                    <>
                      <p className="text-sm font-medium text-slate-900 mb-1">
                        +{montantNum.toLocaleString('fr-FR')} XOF crédités
                      </p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Votre solde a été mis à jour instantanément.
                      </p>
                      <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                        <span className="text-[10px] text-amber-700 font-medium">Mode dev — FedaPay non configuré</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-slate-900 mb-1">Demande créée avec succès</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Finalisez le paiement sur FedaPay. Votre wallet sera crédité automatiquement après confirmation.
                      </p>
                    </>
                  )}
                </div>

                {!modal.isMock && modal.paymentUrl && (
                  <a
                    href={modal.paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-tikexo-accent text-white text-sm font-medium py-3 rounded-lg hover:bg-tikexo-accent/90 transition-colors"
                  >
                    <ExternalLink size={14} />
                    Ouvrir la page de paiement FedaPay
                  </a>
                )}

                <button
                  onClick={fermerModal}
                  className={clsx(
                    'w-full text-sm font-medium py-2.5 rounded-lg transition-colors',
                    modal.isMock
                      ? 'bg-tikexo-primary text-white hover:bg-tikexo-primary/90'
                      : 'text-slate-400 hover:text-slate-600 text-xs'
                  )}
                >
                  {modal.isMock ? 'Voir le nouveau solde' : 'Fermer'}
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
