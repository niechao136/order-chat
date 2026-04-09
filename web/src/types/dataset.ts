
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
