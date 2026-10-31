import { api } from '../../lib/api';
export interface DashboardSummary {
  businessDate: string;
  timezone: string;
  employees: { total: number; active: number; inactive: number };
  today: { total: number; completed: number };
  trend: { day: string; total: number; completed: number }[];
}
export async function getDashboardSummary(signal?: AbortSignal) {
  return (await api.get<DashboardSummary>('/dashboard/summary', { signal })).data;
}
