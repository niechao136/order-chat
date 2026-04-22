
export interface ApiKeyInfo {
  id: string
  name: string
  key: string
  prefix: string
  permissions: string[]
  rate_limit: number
  created_at: string
  last_used_at?: string
  expires_at?: string
  is_active: boolean
  description?: string
}

export interface ApiKeyAdd {
  id: string
  name: string
  key: string
  prefix: string
  created_at: string
}
