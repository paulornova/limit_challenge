import { apiClient } from '@/lib/api-client';

export interface Mechanic {
  id: number;
  name: string;
  certification_number: string;
  active: boolean;
}

export interface MechanicWorkload {
  id: number;
  name: string;
  certification_number: string;
  maintenance_count_current_year: number;
  maintenance_cost_current_year: string | number;
}

export interface MechanicPayload {
  name: string;
  certification_number: string;
  active: boolean;
}

export async function fetchMechanicWorkload() {
  const response = await apiClient.get<MechanicWorkload[]>('/mechanics/workload/');
  return response.data;
}

export async function fetchMechanic(id: number) {
  const response = await apiClient.get<Mechanic>(`/mechanics/${id}/`);
  return response.data;
}

export async function createMechanic(payload: MechanicPayload) {
  const response = await apiClient.post<Mechanic>('/mechanics/', payload);
  return response.data;
}

export async function updateMechanic(id: number, payload: MechanicPayload) {
  const response = await apiClient.patch<Mechanic>(`/mechanics/${id}/`, payload);
  return response.data;
}

export async function deleteMechanic(id: number) {
  await apiClient.delete(`/mechanics/${id}/`);
}
