import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { INSCRIPTION_CSS } from './inscription/styles';
import SidePanel from './inscription/SidePanel';
import Step1Entreprise from './inscription/Step1Entreprise';
import Step2Plan from './inscription/Step2Plan';
import Step3Recharge from './inscription/Step3Recharge';
import StepOTP from './inscription/StepOTP';
import StepSuccess from './inscription/StepSuccess';
import { DEFAULT_DATA, type InscriptionData } from './inscription/types';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Etape = 1 | 2 | 3 | 'otp' | 'succes';

interface InscriptionResult {
  entreprise_id: string;
  user_id: string;
  telephone: string;
  plan: string;
}

export default function Inscription() {
  const navigate = useNavigate();
  const { verifierOtp } = useAuth();

  const [etape, setEtape] = useState<Etape>(1);
  const [data, setData] = useState<InscriptionData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [result, setResult] = useState<InscriptionResult | null>(null);
  const [walletSolde, setWalletSolde] = useState<number | undefined>(undefined);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  function patch(p: Partial<InscriptionData>) {
    setData((prev) => ({ ...prev, ...p }));
    setErreur(null);
  }

  // Soumettre inscription + lancer OTP (step 3 avec recharge)
  async function soumettre(avecRecharge: boolean) {
    setLoading(true);
    setErreur(null);
    try {
      const montantNum = avecRecharge
        ? parseInt(data.recharge.montant.replace(/\D/g, '') || '0', 10)
        : 0;

      const { data: res } = await api.post('/inscription', {
        entreprise: data.entreprise,
        admin: data.admin,
        plan: data.plan,
        recharge: avecRecharge && montantNum >= 10000
          ? { montant: montantNum, telephonePayeur: data.admin.telephone }
          : null,
      });

      setResult(res.data);

      // Résultat recharge retourné directement par le backend
      if (res.data.recharge) {
        if (res.data.recharge.mock) {
          // Dev mock — wallet déjà crédité
          setWalletSolde(res.data.recharge.montant);
        } else {
          // Prod — lien FedaPay à afficher sur l'écran succès
          setPaymentUrl(res.data.recharge.payment_url);
        }
      }

      // OTP déjà envoyé par le backend — passer à l'étape OTP
      setEtape('otp');
    } catch (err: any) {
      setErreur(err?.response?.data?.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  async function verifierCode(code: string) {
    if (!result) return;
    setLoading(true);
    setErreur(null);
    try {
      const user = await verifierOtp(result.telephone, code);
      setEtape('succes');
      // Redirection automatique dans 3s si ADMIN_RH
      if (user.role === 'ADMIN_RH') {
        setTimeout(() => navigate('/employeur'), 3000);
      }
    } catch (err: any) {
      setErreur(err?.response?.data?.message || 'Code incorrect ou expiré.');
    } finally {
      setLoading(false);
    }
  }

  async function renvoyerOtp() {
    if (!result) return;
    try {
      await api.post('/auth/otp/demander', { telephone: result.telephone });
    } catch { /* silencieux */ }
  }

  return (
    <>
      <style>{INSCRIPTION_CSS}</style>
      <div className="pg" style={{ minHeight: '100vh', background: '#F1F5F9', padding: '32px 16px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>

          {/* Étape 1 — layout 2 colonnes avec panneau sombre */}
          {etape === 1 && (
            <div className="two">
              <SidePanel etapeActive={1} />
              <Step1Entreprise
                data={data}
                onChange={patch}
                onNext={() => setEtape(2)}
              />
            </div>
          )}

          {/* Étape 2 — plan */}
          {etape === 2 && (
            <Step2Plan
              data={data}
              onChange={patch}
              onNext={() => setEtape(3)}
              onBack={() => setEtape(1)}
            />
          )}

          {/* Étape 3 — rechargement */}
          {etape === 3 && (
            <Step3Recharge
              data={data}
              onChange={patch}
              onSubmit={() => soumettre(true)}
              onSkip={() => soumettre(false)}
              onBack={() => setEtape(2)}
              loading={loading}
              erreur={erreur}
            />
          )}

          {/* Étape OTP */}
          {etape === 'otp' && result && (
            <StepOTP
              telephone={result.telephone}
              onVerify={verifierCode}
              onResend={renvoyerOtp}
              loading={loading}
              erreur={erreur}
            />
          )}

          {/* Succès */}
          {etape === 'succes' && result && (
            <StepSuccess
              data={data}
              entrepriseId={result.entreprise_id}
              walletSolde={walletSolde}
              paymentUrl={paymentUrl}
            />
          )}

        </div>
      </div>
    </>
  );
}
