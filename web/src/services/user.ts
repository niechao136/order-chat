import { apiRequest } from '@/services/api';
import { DataResult, PageParams, PageResult } from '@/types/api';
import { UserInfo } from '@/types/user';
import { getParams } from '@/utils/string';


export async function getUserList(params?: PageParams) {
  const res = await apiRequest(`user${getParams(params)}`)
  const data: PageResult<UserInfo> = await res.json()
  return data
}

export async function getOwnerInfo() {
  const res = await apiRequest('user/me')
  const data: DataResult<UserInfo> = await res.json()
  return data
}

export async function getUserInfo(user_id: string) {
  const res = await apiRequest(`user/${user_id}`)
  const data: DataResult<UserInfo> = await res.json()
  return data
}

export async function addUser(body: string) {
  const res = await apiRequest(`user`, {
    method: 'POST',
    body,
  })
  const data: DataResult<UserInfo> = await res.json()
  return data
}

export async function updateUser(user_id: string, body: string) {
  const res = await apiRequest(`user/${user_id}`, {
    method: 'PUT',
    body,
  })
  const data: DataResult<UserInfo> = await res.json()
  return data
}

export async function changeOwnerPwd(body: string) {
  const res = await apiRequest(`user/me/password`, {
    method: 'PATCH',
    body,
  })
  const data: DataResult = await res.json()
  return data
}

export async function changeUserPwd(user_id: string, body: string) {
  const res = await apiRequest(`user/${user_id}/password`, {
    method: 'PATCH',
    body,
  })
  const data: DataResult = await res.json()
  return data
}
