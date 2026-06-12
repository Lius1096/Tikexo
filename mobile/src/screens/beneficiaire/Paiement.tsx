import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';

export default function Paiement() {
  const [commercantId, setCommercantId] = useState('');
  const [montant, setMontant] = useState('');

  const payer = useMutation({
    mutationFn: () =>
      axios.post('/api/v1/transactions', {
        commercantId,
        montantTotal: parseFloat(montant),
      }),
    onSuccess: () => {
      Alert.alert('TIKEXO', 'Paiement effectué avec succès !');
      setMontant('');
      setCommercantId('');
    },
    onError: (err: any) => {
      Alert.alert('TIKEXO — Erreur', err.response?.data?.error || 'Paiement impossible');
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.titre}>Effectuer un paiement</Text>

        <Text style={styles.label}>ID Commerçant (scanné via QR)</Text>
        <TextInput
          style={styles.input}
          value={commercantId}
          onChangeText={setCommercantId}
          placeholder="Scan le QR code du commerçant"
          placeholderTextColor={colors.dark + '60'}
        />

        <Text style={styles.label}>Montant (XOF)</Text>
        <TextInput
          style={[styles.input, styles.inputMontant]}
          value={montant}
          onChangeText={setMontant}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.dark + '60'}
        />

        <TouchableOpacity
          style={[styles.btn, payer.isPending && styles.btnDisabled]}
          onPress={() => payer.mutate()}
          disabled={payer.isPending || !commercantId || !montant}
        >
          <Text style={styles.btnText}>
            {payer.isPending ? 'Traitement...' : 'Payer avec TIKEXO'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray, padding: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  titre: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary, marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, color: colors.dark + 'AA', marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.dark,
    marginBottom: spacing.md,
    backgroundColor: colors.lightGray,
  },
  inputMontant: { fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center' },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
});
