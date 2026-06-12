import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function Card({ children, className, title, subtitle }: CardProps) {
  return (
    <div className={clsx('bg-white rounded-lg shadow-sm border border-tikexo-light-gray p-6', className)}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-semibold text-tikexo-dark font-sans">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({ label, value, currency = false }: { label: string; value: number | string; currency?: boolean }) {
  return (
    <Card>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={clsx('text-2xl font-bold mt-1 text-tikexo-primary', currency && 'font-mono')}>
        {currency ? `${Number(value).toLocaleString('fr-FR')} XOF` : value}
      </p>
    </Card>
  );
}
