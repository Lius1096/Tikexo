import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { ApiListResponse, AuditEntry } from '../types';

interface FiltresAudit {
  page?: number;
  action?: string;
  userId?: string;
}

export function useAuditLogs(filtres: FiltresAudit = {}) {
  const params = new URLSearchParams();
  if (filtres.page)   params.set('page',   String(filtres.page));
  if (filtres.action) params.set('action', filtres.action);
  if (filtres.userId) params.set('userId', filtres.userId);

  return useQuery<ApiListResponse<AuditEntry>>({
    queryKey: ['audit', filtres],
    queryFn: async () => {
      const { data } = await api.get(`/admin/audit?${params}`);
      return data.data;
    },
    staleTime: 60_000,
  });
}
