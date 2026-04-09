
export interface PageResult<T = string> {
  data: T[]
  total: number
  page?: number
  size?: number
}


export interface DataResult<T = string> {
  data?: T
  msg?: string
  status: number
}


export interface PageParams {
  page?: number
  size?: number

  order_by?: string
  direction?: 'asc' | 'desc'

  keyword?: string
}
