import { apiRequest } from '@/services/api';
import { DataResult, PageParams, PageResult } from '@/types/api';
import { ApiKeyInfo, ApiKeyAdd } from '@/types/api-key';
import { getParams } from '@/utils/string';


export async function getApiKeyList(params?: PageParams) {
  const res = await apiRequest(`api_key${getParams(params)}`);
  const data: PageResult<ApiKeyInfo> = await res.json();
  return data;
}

export async function getApiKeyCount() {
  const res = await apiRequest(`api_key/count`);
  const data: DataResult<number> = await res.json();
  return data;
}

export async function addApiKey(body: string) {
  const res = await apiRequest('api_key', {
    method: 'POST',
    body,
  });
  const data: DataResult<ApiKeyAdd> = await res.json();
  return data;
}

export async function deleteApiKey(body: string) {
  const res = await apiRequest(`api_key/delete`, {
    method: 'Delete',
    body,
  });
  const data: DataResult = await res.json();
  return data;
}

export async function toggleApiKey(key_id: string, body: string) {
  const res = await apiRequest(`api_key/${key_id}/toggle`, {
    method: 'PATCH',
    body,
  });
  const data: DataResult<boolean> = await res.json();
  return data;
}
