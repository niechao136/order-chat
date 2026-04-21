import { apiRequest } from '@/services/api';
import { DataResult } from '@/types/api';


export async function login(body: string) {
  const res = await apiRequest('auth/login', {
    method: 'POST',
    body,
  });
  const data: DataResult = await res.json();
  return data;
}


export async function register(body: string) {
  const res = await apiRequest('auth/register', {
    method: 'POST',
    body,
  });
  const data: DataResult = await res.json();
  return data;
}
