import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

// Cible de callback_url pour les paiements FedaPay (recharge wallet
// entreprise) — le crédit réel du wallet se fait côté serveur via le
// webhook FedaPay, indépendamment de cette page ; elle sert uniquement de
// retour visuel pour l'utilisateur redirigé depuis FedaPay.
export default function PaiementCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const status = params.get('status');
  const id = params.get('id');

  useEffect(() => {
    const t = setTimeout(() => navigate('/employeur/wallet'), 5000);
    return () => clearTimeout(t);
  }, [navigate]);

  const succes = status === 'approved';
  const echec = status === 'declined' || status === 'canceled';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        {succes && (
          <>
            <CheckCircle2 className="mx-auto mb-4 text-green-600" size={48} />
            <h1 className="text-lg font-semibold text-slate-800 mb-2">Paiement effectué</h1>
            <p className="text-sm text-slate-500 mb-6">
              Votre paiement a été confirmé par FedaPay. Le solde de votre wallet TIKEXO est mis à jour automatiquement, généralement en quelques secondes.
            </p>
          </>
        )}
        {echec && (
          <>
            <XCircle className="mx-auto mb-4 text-red-600" size={48} />
            <h1 className="text-lg font-semibold text-slate-800 mb-2">Paiement non abouti</h1>
            <p className="text-sm text-slate-500 mb-6">
              Le paiement n'a pas pu être finalisé. Aucun montant n'a été débité. Vous pouvez réessayer depuis votre espace wallet.
            </p>
          </>
        )}
        {!succes && !echec && (
          <>
            <Clock className="mx-auto mb-4 text-amber-500" size={48} />
            <h1 className="text-lg font-semibold text-slate-800 mb-2">Paiement en cours de traitement</h1>
            <p className="text-sm text-slate-500 mb-6">
              Nous confirmons votre paiement avec FedaPay. Ça ne prend généralement que quelques secondes.
            </p>
          </>
        )}
        {id && <p className="text-xs text-slate-400 mb-6">Référence : {id}</p>}
        <button
          onClick={() => navigate('/employeur/wallet')}
          className="w-full bg-[#1A3C5E] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#15304c] transition"
        >
          Retour à mon wallet
        </button>
      </div>
    </div>
  );
}
