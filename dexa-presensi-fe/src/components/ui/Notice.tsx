import { type ReactNode } from 'react';

export function Notice({
  children,
  type = 'error',
}: {
  children: ReactNode;
  type?: 'error' | 'success';
}) {
  return (
    <div className={`notice notice-${type}`} role="alert">
      {children}
    </div>
  );
}
