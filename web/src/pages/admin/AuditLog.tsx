import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Table } from '../../design-system/components/Table';

type AuditEntry = {
  id: string; action: string; entite: string; entite_id: string;
  user?: { nom: string; prenom: string; role: string };
  ip: string; createdAt: string;
};

export default function AdminAuditLog() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/admin/audit-logs').then((r) => r.data.data),
  });

  const columns = [
    { key: 'action', header: 'Action' },
    { key: 'entite', header: 'Entité' },
    { key: 'entite_id', header: 'ID entité' },
    {
      key: 'user',
      header: 'Utilisateur',
      render: (r: AuditEntry) =>
        r.user ? `${r.user.prenom} ${r.user.nom} (${r.user.role})` : 'Système',
    },
    { key: 'ip', header: 'IP' },
    {
      key: 'createdAt',
      header: 'Date',
      render: (r: AuditEntry) => new Date(r.createdAt).toLocaleString('fr-FR'),
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-tikexo-dark mb-6">Journal d'audit TIKEXO</h2>
      <p className="text-sm text-gray-500 mb-4">
        Ce journal est immuable — aucune entrée ne peut être modifiée ou supprimée.
      </p>
      {isLoading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : (
        <Table columns={columns} data={data?.items || []} emptyMessage="Aucune entrée" />
      )}
    </div>
  );
}
