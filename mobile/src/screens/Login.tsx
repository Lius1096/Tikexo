import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius, fontSize, shadows } from '../design-system/tokens';

type Etape = 'login' | 'forgot-email' | 'forgot-code';

export default function LoginScreen() {
  const { login } = useAuth();

  const [etape, setEtape] = useState<Etape>('login');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');
  const [code, setCode] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [resetOk, setResetOk] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !motDePasse) { setErreur('Entrez votre email et votre mot de passe.'); return; }
    setErreur(''); setLoading(true);
    try {
      const u = await login(email.trim().toLowerCase(), motDePasse);
      if (!['BENEFICIAIRE', 'COMMERCANT'].includes(u.role)) {
        setErreur("Ce rôle n'est pas pris en charge sur l'app mobile TIKEXO.");
      }
    } catch (e: any) {
      setErreur(e?.response?.data?.error || 'Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit() {
    if (!forgotEmail.trim()) { setErreur('Entrez votre adresse email.'); return; }
    setErreur(''); setLoading(true);
    try {
      await api.post('/auth/mot-de-passe/oublie', { email: forgotEmail.trim().toLowerCase() });
      setEtape('forgot-code');
    } catch (e: any) {
      setErreur(e?.response?.data?.error || "Erreur lors de l'envoi. Vérifiez votre email.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit() {
    if (!code.trim()) { setErreur('Entrez le code reçu par email.'); return; }
    if (nouveauMdp.length < 6) { setErreur('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    setErreur(''); setLoading(true);
    try {
      await api.post('/auth/mot-de-passe/reinitialiser', {
        email: forgotEmail.trim().toLowerCase(),
        code: code.trim(),
        nouveau_mot_de_passe: nouveauMdp,
      });
      setResetOk(true);
      setTimeout(() => {
        setEtape('login'); setResetOk(false); setCode(''); setNouveauMdp('');
      }, 2000);
    } catch (e: any) {
      setErreur(e?.response?.data?.error || 'Code incorrect ou expiré.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.marque}>TIKEXO</Text>
          <Text style={styles.sousTitre}>Titre-restaurant 100% digital</Text>
        </View>

        <View style={styles.carte}>
          {etape === 'login' && (
            <>
              <Text style={styles.titre}>Connexion</Text>
              <Text style={styles.champLabel}>ADRESSE EMAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="vous@exemple.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={(t) => { setEmail(t); setErreur(''); }}
              />
              <Text style={styles.champLabel}>MOT DE PASSE</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                secureTextEntry
                value={motDePasse}
                onChangeText={(t) => { setMotDePasse(t); setErreur(''); }}
              />
              <TouchableOpacity onPress={() => { setForgotEmail(email); setEtape('forgot-email'); setErreur(''); }}>
                <Text style={styles.lien}>Mot de passe oublié ?</Text>
              </TouchableOpacity>

              {!!erreur && <Text style={styles.erreur}>{erreur}</Text>}

              <TouchableOpacity style={styles.bouton} onPress={handleLogin} disabled={loading}>
                <Text style={styles.boutonTexte}>{loading ? 'Connexion en cours…' : 'Se connecter'}</Text>
              </TouchableOpacity>
            </>
          )}

          {etape === 'forgot-email' && (
            <>
              <TouchableOpacity onPress={() => { setEtape('login'); setErreur(''); }}>
                <Text style={styles.retour}>← Retour</Text>
              </TouchableOpacity>
              <Text style={styles.titre}>Mot de passe oublié</Text>
              <Text style={styles.description}>
                Entrez votre email. Vous recevrez un code à 6 chiffres pour réinitialiser votre mot de passe.
              </Text>
              <Text style={styles.champLabel}>ADRESSE EMAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="vous@exemple.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={forgotEmail}
                onChangeText={(t) => { setForgotEmail(t); setErreur(''); }}
              />
              {!!erreur && <Text style={styles.erreur}>{erreur}</Text>}
              <TouchableOpacity style={styles.bouton} onPress={handleForgotSubmit} disabled={loading}>
                <Text style={styles.boutonTexte}>{loading ? 'Envoi en cours…' : 'Envoyer le code'}</Text>
              </TouchableOpacity>
            </>
          )}

          {etape === 'forgot-code' && (
            <>
              <TouchableOpacity onPress={() => { setEtape('forgot-email'); setErreur(''); }}>
                <Text style={styles.retour}>← Retour</Text>
              </TouchableOpacity>
              <Text style={styles.titre}>Nouveau mot de passe</Text>
              {resetOk ? (
                <Text style={styles.succes}>Mot de passe réinitialisé ! Redirection…</Text>
              ) : (
                <>
                  <Text style={styles.champLabel}>CODE REÇU PAR EMAIL</Text>
                  <TextInput
                    style={[styles.input, styles.inputCode]}
                    placeholder="· · · · · ·"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={code}
                    onChangeText={(t) => { setCode(t.replace(/\D/g, '').slice(0, 6)); setErreur(''); }}
                  />
                  <Text style={styles.champLabel}>NOUVEAU MOT DE PASSE</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    secureTextEntry
                    value={nouveauMdp}
                    onChangeText={(t) => { setNouveauMdp(t); setErreur(''); }}
                  />
                  {!!erreur && <Text style={styles.erreur}>{erreur}</Text>}
                  <TouchableOpacity style={styles.bouton} onPress={handleResetSubmit} disabled={loading}>
                    <Text style={styles.boutonTexte}>{loading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  marque: { color: colors.white, fontSize: fontSize.xl, fontWeight: '700', letterSpacing: 3 },
  sousTitre: { color: colors.white + 'AA', fontSize: fontSize.xs, marginTop: spacing.xs },
  carte: { width: '100%', maxWidth: 380, backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg, ...shadows.card },
  titre: { fontSize: fontSize.md, fontWeight: '700', color: colors.dark, marginBottom: spacing.md },
  description: { fontSize: fontSize.sm, color: colors.dark + 'AA', marginBottom: spacing.md, lineHeight: 18 },
  champLabel: { fontSize: fontSize.xs, color: colors.dark + '99', marginBottom: spacing.xs, letterSpacing: 0.3 },
  input: {
    borderWidth: 1, borderColor: colors.lightGray, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.base,
    marginBottom: spacing.sm, backgroundColor: colors.background, color: colors.dark,
  },
  inputCode: { textAlign: 'center', letterSpacing: 6, fontVariant: ['tabular-nums'] },
  lien: { color: colors.accent, fontSize: fontSize.xs, textAlign: 'right', marginBottom: spacing.md },
  retour: { color: colors.dark + '99', fontSize: fontSize.xs, marginBottom: spacing.md },
  erreur: { color: colors.danger, fontSize: fontSize.xs, backgroundColor: '#FEF2F2', borderRadius: borderRadius.sm, padding: spacing.sm, marginBottom: spacing.md },
  succes: { color: colors.success, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.lg },
  bouton: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xs },
  boutonTexte: { color: colors.white, fontSize: fontSize.base, fontWeight: '600' },
});
