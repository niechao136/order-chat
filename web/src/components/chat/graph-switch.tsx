'use client';

import { useState } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger, SidebarMenu, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';


export function GraphSwitch({ graph }: { graph: string }) {
  const { isMobile } = useSidebar()
  const [] = useState(graph)
}
