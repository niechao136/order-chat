import * as z from 'zod';

export interface ColDescr {
  name: string
}

export type ColStatus = 'green' | 'yellow' | 'grey' | 'red'

export interface ColInfo {
  status: ColStatus
  indexed_vectors_count?: number
  points_count?: number
  segments_count: number
}

export interface PayloadInfo {
  content: string
  updated_at: number
  [key: string]: unknown
}

export interface RecordInfo {
  id: string
  payload: PayloadInfo
}

export interface ScoredPoint {
  id: string
  payload: PayloadInfo
  score: number
}

export interface FieldItem {
  field_name: string
  field_type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  is_required: boolean
  default_value?: unknown
  description?: string
}

export type CommonZod = z.ZodString | z.ZodNumber | z.ZodBoolean | z.ZodAny | z.ZodOptional | z.ZodPipe;
