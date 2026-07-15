import { clsx } from 'clsx';

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('bg-slate-100 animate-pulse rounded', className)} />;
}
