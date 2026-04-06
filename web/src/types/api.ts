
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
