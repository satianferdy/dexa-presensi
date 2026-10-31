import { type ReactNode } from 'react';
import { Activity } from 'lucide-react';

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <Activity size={24} />
      <p>{children}</p>
    </div>
  );
}
