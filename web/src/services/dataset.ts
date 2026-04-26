
import { apiRequest } from '@/services/api';
import { DataResult, PageParams, PageResult } from '@/types/api';
import { DatasetDescr, DatasetInfo, FieldItem, PointInfo, ScoredPoint } from '@/types/dataset';
import { getParams } from '@/utils/string';


export async function getDatasetList() {
  const res = await apiRequest('dataset');
  const data: DataResult<DatasetDescr[]> = await res.json();
  return data;
}

export async function addDataset(body: string) {
  const res = await apiRequest('dataset', {
    method: 'POST',
    body,
  });
  const data: DataResult<DatasetInfo> = await res.json();
  return data;
}

export async function getDatasetInfo(name: string) {
  const res = await apiRequest(`dataset/${name}`);
  const data: DataResult<DatasetInfo> = await res.json();
  return data;
}

export async function deleteDataset(name: string) {
  const res = await apiRequest(`dataset/${name}`, {
    method: 'DELETE',
  });
  const data: DataResult = await res.json();
  return data;
}

export async function clearDataset(name: string) {
  const res = await apiRequest(`dataset/${name}/clear`, {
    method: 'DELETE',
  });
  const data: DataResult = await res.json();
  return data;
}

export async function getPointList(name: string, params?: PageParams) {
  const res = await apiRequest(`dataset/${name}/points${getParams(params)}`);
  const data: PageResult<PointInfo> = await res.json();
  return data;
}

export async function getPointCount(name: string) {
  const res = await apiRequest(`dataset/${name}/count`);
  const data: DataResult<number> = await res.json();
  return data;
}

export async function getAllPoints(name: string) {
  const res = await apiRequest(`dataset/${name}/all`);
  const data: DataResult<PointInfo[]> = await res.json();
  return data;
}

export async function getBatchPoints(name: string, body: string) {
  const res = await apiRequest(`dataset/${name}/batch`, {
    method: 'POST',
    body,
  });
  const data: DataResult<PointInfo[]> = await res.json();
  return data;
}

export async function addPoint(name: string, body: string) {
  const res = await apiRequest(`dataset/${name}/points`, {
    method: 'POST',
    body,
  });
  const data: DataResult = await res.json();
  return data;
}

export async function uploadPoints(name: string, body: string) {
  const res = await apiRequest(`dataset/${name}/upload`, {
    method: 'POST',
    body,
  });
  const data: DataResult<string[]> = await res.json();
  return data;
}

export async function updatePoint(name: string, id: string, body: string) {
  const res = await apiRequest(`dataset/${name}/point/${id}`, {
    method: 'PUT',
    body,
  });
  const data: DataResult = await res.json();
  return data;
}

export async function getPointInfo(name: string, id: string) {
  const res = await apiRequest(`dataset/${name}/point/${id}`);
  const data: DataResult<PointInfo> = await res.json();
  return data;
}

export async function deletePoints(name: string, body: string) {
  const res = await apiRequest(`dataset/${name}/points`, {
    method: 'DELETE',
    body,
  });
  const data: DataResult = await res.json();
  return data;
}

export async function searchPoints(name: string, body: string) {
  const res = await apiRequest(`dataset/${name}/search`, {
    method: 'POST',
    body,
  });
  const data: DataResult<ScoredPoint[]> = await res.json();
  return data;
}

export async function getFieldList(name: string) {
  const res = await apiRequest(`dataset/${name}/fields`);
  const data: DataResult<FieldItem[]> = await res.json();
  return data;
}

export async function setFieldList(name: string, body: string) {
  const res = await apiRequest(`dataset/${name}/fields`, {
    method: 'POST',
    body,
  });
  const data: DataResult = await res.json();
  return data;
}
