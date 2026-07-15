import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiListResponse, Entreprise } from '../types';

interface FiltresEntreprises {
  page?: number;
  limit?: number;
  statut?: string;
}

export function useEntreprises(filtres: FiltresEntreprises = {}) {
  const params = new URLSearchParams();
  if (filtres.page)   params.set('page',   String(filtres.page));
  if (filtres.limit)  params.set('limit',  String(filtres.limit));
  if (filtres.statut) params.set('statut', filtres.statut);

  return useQuery<ApiListResponse<Entreprise>>({
    queryKey: ['entreprises', filtres],
    queryFn: async () => {
      const { data } = await api.get(`/entreprises?${params}`);
      return data.data;
    },
    staleTime: 30_000,
  });
}
