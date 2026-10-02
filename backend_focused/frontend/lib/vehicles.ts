import { apiClient } from '@/lib/api-client';

export interface Vehicle {
  id: number;
  vin: string;
  license_plate: string;
  make: string;
  model: string;
  year: number;
  office: number;
  active: boolean;
}

export interface Office {
  id: number;
  name: string;
  city: string;
}

export interface Mechanic {
  id: number;
  name: string;
  certification_number: string;
  active: boolean;
}

export interface MaintenanceRecord {
  id: number;
  maintenance_date: string;
  maintenance_type: string;
  cost: string | number;
  notes: string;
  mechanic: Mechanic;
}

export interface VehicleDetail extends Omit<Vehicle, 'office'> {
  office: Office;
  maintenance_records: MaintenanceRecord[];
}

export interface MaintenanceDueVehicle extends Vehicle {
  last_maintenance: string | null;
}

export interface VehiclePayload {
  vin: string;
  license_plate: string;
  make: string;
  model: string;
  year: number;
  office: number;
  active: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface VehicleSearchParams {
  office?: string;
  active?: string;
  make?: string;
  model?: string;
  maintenance_date_from?: string;
  maintenance_date_to?: string;
  mechanic_certification_number?: string;
  page: number;
}

export type VehicleFilterValues = Omit<VehicleSearchParams, 'page'>;

export const emptyVehicleFilters: VehicleFilterValues = {
  office: '',
  active: '',
  make: '',
  model: '',
  maintenance_date_from: '',
  maintenance_date_to: '',
  mechanic_certification_number: '',
};

const filterKeys = [
  'office',
  'active',
  'make',
  'model',
  'maintenance_date_from',
  'maintenance_date_to',
  'mechanic_certification_number',
] as const;

export function parseVehicleSearchParams(searchParams: URLSearchParams): VehicleSearchParams {
  const filters: VehicleFilterValues = { ...emptyVehicleFilters };

  filterKeys.forEach((key) => {
    filters[key] = searchParams.get(key) ?? '';
  });

  const rawPage = Number(searchParams.get('page') ?? '1');
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  return { ...filters, page };
}

export function vehicleSearchUrl(filters: VehicleFilterValues, page = 1) {
  const searchParams = new URLSearchParams();

  filterKeys.forEach((key) => {
    const value = filters[key]?.trim();
    if (value) {
      searchParams.set(key, value);
    }
  });

  if (page > 1) {
    searchParams.set('page', String(page));
  }

  const query = searchParams.toString();
  return query ? `/vehicles?${query}` : '/vehicles';
}

export function hasVehicleFilters(filters: VehicleFilterValues) {
  return filterKeys.some((key) => Boolean(filters[key]?.trim()));
}

export async function fetchVehicles(params: VehicleSearchParams) {
  const queryParams: Record<string, string | number> = { page: params.page };

  filterKeys.forEach((key) => {
    const value = params[key]?.trim();
    if (value) {
      queryParams[key] = value;
    }
  });

  const response = await apiClient.get<PaginatedResponse<Vehicle>>('/vehicles/', {
    params: queryParams,
  });
  return response.data;
}

export async function fetchVehicle(id: number) {
  const response = await apiClient.get<VehicleDetail>(`/vehicles/${id}/`);
  return response.data;
}

export async function fetchMaintenanceDueVehicles() {
  const response = await apiClient.get<MaintenanceDueVehicle[]>('/vehicles/needing-maintenance/');
  return response.data;
}

export async function fetchOffices() {
  const firstResponse = await apiClient.get<PaginatedResponse<Office>>('/offices/');
  const offices = [...firstResponse.data.results];
  let next = firstResponse.data.next;

  while (next) {
    const response = await apiClient.get<PaginatedResponse<Office>>(next);
    offices.push(...response.data.results);
    next = response.data.next;
  }

  return offices;
}

export async function createVehicle(payload: VehiclePayload) {
  const response = await apiClient.post<Vehicle>('/vehicles/', payload);
  return response.data;
}

export async function updateVehicle(id: number, payload: VehiclePayload) {
  const response = await apiClient.patch<Vehicle>(`/vehicles/${id}/`, payload);
  return response.data;
}

export async function deleteVehicle(id: number) {
  await apiClient.delete(`/vehicles/${id}/`);
}
