import * as z from 'zod';

export interface DatasetDescr {
  name: string
}

export type DatasetStatus = 'green' | 'yellow' | 'grey' | 'red'

export interface DatasetInfo {
  status: DatasetStatus
  indexed_vectors_count?: number
  points_count?: number
  segments_count: number
}

export interface PayloadInfo {
  content: string
  updated_at: number
  [key: string]: unknown
}

export interface PointInfo {
  id: string
  payload: PayloadInfo
}

export interface ScoredPoint {
  id: string
  payload: PayloadInfo
  score: number
}

export type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface FieldItem {
  field_name: string
  field_type: FieldType
  is_required: boolean
  default_value?: unknown
  description?: string
}

export type CommonZod = z.ZodString | z.ZodNumber | z.ZodBoolean | z.ZodAny | z.ZodOptional | z.ZodPipe;

// 筛选条件操作符
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like';

// 单个筛选条件
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
}
