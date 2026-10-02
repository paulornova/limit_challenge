import { apiClient } from '@/lib/api-client';

export interface OfficeSummary {
  id: number;
  name: string;
  city: string;
  active_vehicle_count: number;
  maintenance_cost_last_year: string | number;
  last_maintenance: string | null;
}

export async function fetchOfficeSummary() {
  const response = await apiClient.get<OfficeSummary[]>('/offices/summary/');
  return response.data;
}
