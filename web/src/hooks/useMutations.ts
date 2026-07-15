import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiListResponse, Mutation } from '../types';

interface FiltresMutations {
  page?: number;
  statut?: string;
}

export function useMutations(filtres: FiltresMutations = {}) {
  const params = new URLSearchParams();
  if (filtres.page)   params.set('page',   String(filtres.page));
  if (filtres.statut) params.set('statut', filtres.statut);

  return useQuery<ApiListResponse<Mutation>>({
    queryKey: ['mutations', filtres],
    queryFn: async () => {
      const { data } = await api.get(`/mutations?${params}`);
      return data.data;
    },
    staleTime: 30_000,
  });
}
