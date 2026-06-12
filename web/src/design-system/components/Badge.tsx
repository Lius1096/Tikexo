import React from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-tikexo-success',
  danger: 'bg-red-100 text-tikexo-danger',
  warning: 'bg-amber-100 text-tikexo-gold',
  info: 'bg-tikexo-light-blue text-tikexo-primary',
  neutral: 'bg-tikexo-light-gray text-tikexo-dark',
};

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      variantClasses[variant],
      className
    )}>
      {children}
    </span>
  );
}
