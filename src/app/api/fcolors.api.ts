import { apiFetch } from './_base';

export type Fcolor = {
  id: number;
  color: string;
};

export type CreateFcolorData = Omit<Fcolor, 'id'>;

export function getFColors() {
  return apiFetch<Fcolor[]>('/api/framecolors');
}

export function getFColor(id: number) {
  return apiFetch<Fcolor>(`/api/framecolors/${id}`);
}

export function createFColor(data: CreateFcolorData) {
  return apiFetch<Fcolor>('/api/framecolors', { method: 'POST', body: data });
}

export function updateFColor(id: number, data: CreateFcolorData) {
  return apiFetch<Fcolor>(`/api/framecolors/${id}`, { method: 'PATCH', body: data });
}

export function deleteFColor(id: number) {
  return apiFetch<Fcolor>(`/api/framecolors/${id}`, { method: 'DELETE' });
}
