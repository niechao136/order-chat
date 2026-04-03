import { apiRequest } from '@/services/api'


export async function login(body: string) {
  const res = await apiRequest('auth/login', {
    method: 'POST',
    body,
  })
  return await res.json()
}


export async function register(body: string) {
  const res = await apiRequest('auth/register', {
    method: 'POST',
    body,
  })
  return await res.json()
}
