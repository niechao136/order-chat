
import { apiRequest } from '@/services/api';
import { DataResult, PageParams, PageResult } from '@/types/api';
import { ColDescr, ColInfo, RecordInfo, ScoredPoint } from '@/types/dataset';
import { getParams } from '@/utils/string';


export async function getColList() {
  const res = await apiRequest('dataset')
  const data: PageResult<ColDescr> = await res.json()
  return data
}

export async function addCol(body: string) {
  const res = await apiRequest('dataset', {
    method: 'POST',
    body,
  })
  const data: DataResult<ColInfo> = await res.json()
  return data
}

export async function getColInfo(name: string) {
  const res = await apiRequest(`dataset/${name}`)
  const data: DataResult<ColInfo> = await res.json()
  return data
}

export async function deleteCol(name: string) {
  const res = await apiRequest(`dataset/${name}`, {
    method: 'DELETE',
  })
  const data: DataResult = await res.json()
  return data
}

export async function clearCol(name: string) {
  const res = await apiRequest(`dataset/${name}/clear`, {
    method: 'DELETE',
  })
  const data: DataResult = await res.json()
  return data
}

export async function getRecordList(name: string, params?: PageParams) {
  const res = await apiRequest(`dataset/${name}/item${getParams(params)}`)
  const data: PageResult<RecordInfo> = await res.json()
  return data
}

export async function addRecord(name: string, body: string) {
  const res = await apiRequest(`dataset/${name}/item`, {
    method: 'POST',
    body,
  })
  const data: DataResult = await res.json()
  return data
}

export async function uploadRecord(name: string, body: FormData) {
  const res = await apiRequest(`dataset/${name}/item/upload`, {
    method: 'POST',
    body,
  })
  const data: DataResult<string[]> = await res.json()
  return data
}

export async function updateRecord(name: string, id: string, body: string) {
  const res = await apiRequest(`dataset/${name}/item/${id}`, {
    method: 'PUT',
    body,
  })
  const data: DataResult = await res.json()
  return data
}

export async function getRecordInfo(name: string, id: string) {
  const res = await apiRequest(`dataset/${name}/item/${id}`)
  const data: DataResult<RecordInfo> = await res.json()
  return data
}

export async function deleteRecord(name: string, body: string) {
  const res = await apiRequest(`dataset/${name}/item/delete`, {
    method: 'DELETE',
    body,
  })
  const data: DataResult = await res.json()
  return data
}

export async function searchRecord(name: string, body: string) {
  const res = await apiRequest(`dataset/${name}/search`, {
    method: 'POST',
    body,
  })
  const data: PageResult<ScoredPoint> = await res.json()
  return data
}
