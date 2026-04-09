import { LucideIcon } from 'lucide-react'

export interface NavItem {
  href?: string
  title: string
  children?: NavItem[]
  icon?: LucideIcon
}
