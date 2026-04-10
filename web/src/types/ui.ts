import { LucideIcon } from 'lucide-react'

export interface NavItem {
  href?: string
  title: string
  children?: NavItem[]
  icon?: LucideIcon
}


export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
