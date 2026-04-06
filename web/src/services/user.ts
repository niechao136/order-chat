import { apiRequest } from '@/services/api'
import { DataResult } from '@/types/api'
import { UserInfo } from '@/types/user'


export async function getOwnerInfo() {
  const res = await apiRequest('user/me')
  const data: DataResult<UserInfo> = await res.json()
  return data
}
