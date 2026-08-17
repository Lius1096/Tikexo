import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius, fontSize } from '../design-system/tokens';
import { Card, Button, LinkButton } from '../design-system/components';

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
          <View style={styles.logo}>
            <Ionicons name="restaurant" size={28} color={colors.white} />
          </View>
          <Text style={styles.marque}>TIKEXO</Text>
          <Text style={styles.sousTitre}>Titre-restaurant 100% digital</Text>
        </View>

        <Card style={styles.carte}>
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
              <LinkButton
                title="Mot de passe oublié ?"
                onPress={() => { setForgotEmail(email); setEtape('forgot-email'); setErreur(''); }}
                style={styles.lienWrap}
              />

              {!!erreur && <Text style={styles.erreur}>{erreur}</Text>}

              <Button title="Se connecter" onPress={handleLogin} loading={loading} />
            </>
          )}

          {etape === 'forgot-email' && (
            <>
              <LinkButton title="← Retour" onPress={() => { setEtape('login'); setErreur(''); }} style={styles.retourWrap} />
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
              <Button title="Envoyer le code" onPress={handleForgotSubmit} loading={loading} />
            </>
          )}

          {etape === 'forgot-code' && (
            <>
              <LinkButton title="← Retour" onPress={() => { setEtape('forgot-email'); setErreur(''); }} style={styles.retourWrap} />
              <Text style={styles.titre}>Nouveau mot de passe</Text>
              {resetOk ? (
                <View style={styles.succesWrap}>
                  <Ionicons name="checkmark-circle" size={40} color={colors.success} />
                  <Text style={styles.succes}>Mot de passe réinitialisé ! Redirection…</Text>
                </View>
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
                  <Button title="Réinitialiser le mot de passe" onPress={handleResetSubmit} loading={loading} />
                </>
              )}
            </>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  logo: {
    width: 56, height: 56, borderRadius: borderRadius.full,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  marque: { color: colors.white, fontSize: fontSize.xl, fontWeight: '700', letterSpacing: 3 },
  sousTitre: { color: colors.white + 'AA', fontSize: fontSize.xs, marginTop: spacing.xs },
  carte: { width: '100%', maxWidth: 380 },
  titre: { fontSize: fontSize.md, fontWeight: '700', color: colors.dark, marginBottom: spacing.md },
  description: { fontSize: fontSize.sm, color: colors.dark + 'AA', marginBottom: spacing.md, lineHeight: 18 },
  champLabel: { fontSize: fontSize.xs, color: colors.dark + '99', marginBottom: spacing.xs, letterSpacing: 0.3 },
  input: {
    borderWidth: 1, borderColor: colors.lightGray, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.base,
    marginBottom: spacing.sm, backgroundColor: colors.background, color: colors.dark,
  },
  inputCode: { textAlign: 'center', letterSpacing: 6, fontVariant: ['tabular-nums'] },
  lienWrap: { alignItems: 'flex-end', marginBottom: spacing.md },
  retourWrap: { marginBottom: spacing.md },
  erreur: { color: colors.danger, fontSize: fontSize.xs, backgroundColor: '#FEF2F2', borderRadius: borderRadius.sm, padding: spacing.sm, marginBottom: spacing.md },
  succesWrap: { alignItems: 'center', paddingVertical: spacing.lg },
  succes: { color: colors.success, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.sm },
});
