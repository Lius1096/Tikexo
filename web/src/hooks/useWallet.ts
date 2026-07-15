import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Wallet, ApiListResponse, LedgerEntry } from '../types';

export function useWalletEntreprise(entrepriseId: string | undefined) {
  return useQuery<Wallet>({
    queryKey: ['wallet', 'entreprise', entrepriseId],
    queryFn: async () => {
      const { data } = await api.get(`/entreprises/${entrepriseId}/wallet`);
      return data.data;
    },
    enabled: !!entrepriseId,
    staleTime: 10_000,
  });
}

export function useWalletHistorique(walletId: string | undefined, page = 1) {
  return useQuery<ApiListResponse<LedgerEntry>>({
    queryKey: ['wallet', 'historique', walletId, page],
    queryFn: async () => {
      const { data } = await api.get(`/wallet/${walletId}/historique?page=${page}&limit=20`);
      return data.data;
    },
    enabled: !!walletId,
    staleTime: 15_000,
  });
}
