import React, { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, ROLES_ADMIN, ROLES_EMPLOYEUR } from './context/AuthContext';
import { AdminLayout } from './layouts/AdminLayout';
import { EmployeurLayout } from './layouts/EmployeurLayout';
import { BeneficiaireLayout } from './layouts/BeneficiaireLayout';
import { CommercantLayout } from './layouts/CommercantLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Inscription from './pages/Inscription';
import InscriptionCommercant from './pages/InscriptionCommercant';

// Pages Bénéficiaire
import BeneficiaireDashboard from './pages/beneficiaire/Dashboard';
import BeneficiaireTransactions from './pages/beneficiaire/Transactions';
import BeneficiaireProfil from './pages/beneficiaire/Profil';
import BeneficiaireCommercants from './pages/beneficiaire/Commercants';
import BeneficiaireScanner from './pages/beneficiaire/Scanner';
import BeneficiaireCarte from './pages/beneficiaire/Carte';

// Pages Commerçant
import CommercantDashboard from './pages/commercant/Dashboard';
import CommercantCaisse from './pages/commercant/Caisse';
import CommercantEncaissements from './pages/commercant/Encaissements';
import CommercantQRCode from './pages/commercant/QRCode';
import CommercantProfil from './pages/commercant/Profil';

// Pages Admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminEntreprises from './pages/admin/Entreprises';
import AdminCommercants from './pages/admin/Commercants';
import AdminBeneficiaires from './pages/admin/Beneficiaires';
import AdminMutations from './pages/admin/Mutations';
import AdminCartes from './pages/admin/Cartes';
import AdminFedaPay from './pages/admin/FedaPay';
import AdminAntiFraude from './pages/admin/AntiFraude';
import AdminAuditLog from './pages/admin/AuditLog';
import AdminStatistiques from './pages/admin/Statistiques';
import AdminConfiguration from './pages/admin/Configuration';
import LandingCRM from './pages/admin/LandingCRM';

// Pages Employeur
import EmployeurDashboard from './pages/employeur/Dashboard';
import EmployeurWallet from './pages/employeur/Wallet';
import EmployeurBeneficiaires from './pages/employeur/Beneficiaires';
import EmployeurDotations from './pages/employeur/Dotations';
import EmployeurCartes from './pages/employeur/Cartes';
import EmployeurRapports from './pages/employeur/Rapports';
import EmployeurFacturation from './pages/employeur/Facturation';
import EmployeurParametres from './pages/employeur/Parametres';
import EmployeurKyb from './pages/employeur/KybDossier';

const ROLES_BENEFICIAIRE = ['BENEFICIAIRE'];
const ROLES_COMMERCANT = ['COMMERCANT'];

function RequireAuth({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-tikexo-primary flex items-center justify-center">
        <div className="text-white font-medium tracking-[3px] text-xl animate-pulse">TIKEXO</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Portails de connexion séparés par rôle */}
      <Route path="/login" element={
        <Login allowedRoles={['BENEFICIAIRE']} portalLabel="Espace Salarié" portalSub="MON WALLET REPAS" redirectTo="/beneficiaire" />
      } />
      <Route path="/entreprise/connexion" element={
        <Login allowedRoles={['ADMIN_RH', 'GESTIONNAIRE_RH']} portalLabel="Portail RH" portalSub="ESPACE EMPLOYEUR" redirectTo="/employeur" />
      } />
      <Route path="/restaurant/connexion" element={
        <Login allowedRoles={['COMMERCANT']} portalLabel="Caisse TIKEXO" portalSub="ESPACE COMMERÇANT" redirectTo="/commercant" />
      } />
      <Route path="/admin/connexion" element={
        <Login allowedRoles={['SUPER_ADMIN', 'ADMIN_OPS']} portalLabel="Backoffice" portalSub="ADMINISTRATION" redirectTo="/admin" />
      } />

      <Route path="/inscription" element={<Inscription />} />
      <Route path="/restaurant/inscription" element={<InscriptionCommercant />} />
      <Route path="/" element={<Landing />} />

      <Route
        path="/beneficiaire"
        element={
          <RequireAuth roles={ROLES_BENEFICIAIRE}>
            <ErrorBoundary>
              <BeneficiaireLayout />
            </ErrorBoundary>
          </RequireAuth>
        }
      >
        <Route index element={<BeneficiaireDashboard />} />
        <Route path="transactions" element={<BeneficiaireTransactions />} />
        <Route path="profil" element={<BeneficiaireProfil />} />
        <Route path="commercants" element={<BeneficiaireCommercants />} />
        <Route path="scanner" element={<BeneficiaireScanner />} />
        <Route path="carte" element={<BeneficiaireCarte />} />
      </Route>

      <Route
        path="/commercant"
        element={
          <RequireAuth roles={ROLES_COMMERCANT}>
            <ErrorBoundary>
              <CommercantLayout />
            </ErrorBoundary>
          </RequireAuth>
        }
      >
        <Route index element={<CommercantDashboard />} />
        <Route path="caisse" element={<CommercantCaisse />} />
        <Route path="encaissements" element={<CommercantEncaissements />} />
        <Route path="qrcode" element={<CommercantQRCode />} />
        <Route path="profil" element={<CommercantProfil />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireAuth roles={ROLES_ADMIN}>
            <ErrorBoundary>
              <AdminLayout />
            </ErrorBoundary>
          </RequireAuth>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="entreprises" element={<AdminEntreprises />} />
        <Route path="commercants" element={<AdminCommercants />} />
        <Route path="beneficiaires" element={<AdminBeneficiaires />} />
        <Route path="mutations" element={<AdminMutations />} />
        <Route path="cartes" element={<AdminCartes />} />
        <Route path="fedapay" element={<AdminFedaPay />} />
        <Route path="antifraude" element={<AdminAntiFraude />} />
        <Route path="audit" element={<AdminAuditLog />} />
        <Route path="statistiques" element={<AdminStatistiques />} />
        <Route path="configuration" element={<AdminConfiguration />} />
        <Route path="landing-crm" element={<LandingCRM />} />
      </Route>

      <Route
        path="/employeur"
        element={
          <RequireAuth roles={ROLES_EMPLOYEUR}>
            <ErrorBoundary>
              <EmployeurLayout />
            </ErrorBoundary>
          </RequireAuth>
        }
      >
        <Route index element={<EmployeurDashboard />} />
        <Route path="wallet" element={<EmployeurWallet />} />
        <Route path="beneficiaires" element={<EmployeurBeneficiaires />} />
        <Route path="dotations" element={<EmployeurDotations />} />
        <Route path="cartes" element={<EmployeurCartes />} />
        <Route path="rapports" element={<EmployeurRapports />} />
        <Route path="facturation" element={<EmployeurFacturation />} />
        <Route path="parametres" element={<EmployeurParametres />} />
        <Route path="kyb" element={<EmployeurKyb />} />
      </Route>
    </Routes>
  );
}
