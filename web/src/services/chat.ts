import { apiRequest } from '@/services/api'


export async function getGraphList() {
  const res = await apiRequest('chat')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}
