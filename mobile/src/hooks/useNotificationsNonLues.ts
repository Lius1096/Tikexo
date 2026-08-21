import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

// Polling léger (pas de socket côté mobile) — suffisant pour un badge de
// cloche, pas besoin de temps réel strict ici.
export function useNotificationsNonLues() {
  return useQuery({
    queryKey: ['notifications-non-lues'],
    queryFn: () => api.get('/notifications/non-lues/compte').then((r) => r.data.data.non_lues as number),
    refetchInterval: 60000,
  });
}
