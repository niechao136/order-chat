'use client';

import { ChevronsUpDownIcon, Plus, LogOutIcon, Bolt } from 'lucide-react'

import Link from 'next/link';
import { useParams } from 'next/navigation';

import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { GraphSwitch } from '@/components/chat/graph-switch';
import { handleLogout } from '@/services/api';
import { ChatThread } from '@/types/chat';
import { UserInfo } from '@/types/user';
import { getInitials } from '@/utils/string';

export function ChatSidebar({ graphs, owner, threads }: {
  graphs: string[]
  owner: UserInfo | null
  threads: ChatThread[]
}) {
  const params = useParams();
  const graph = params.graph as string;

  const { isMobile } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader>
        <GraphSwitch graphs={graphs} active={graph}/>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href={`/${graph}`}>
                  <Plus />
                  <span>{'发起新对话'}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarSeparator/>
        <SidebarGroup>
          <SidebarGroupLabel>{'对话历史'}</SidebarGroupLabel>
          <SidebarMenu>
            {threads.map((thread) => (
              <SidebarMenuItem key={thread.thread_id}>
                <SidebarMenuButton asChild>
                  <Link href={`/${graph}/${thread.thread_id}`}>
                    <span>{thread.summary}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">{getInitials(owner?.username ?? '')}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{owner?.username}</span>
                    <span className="truncate text-xs">{owner?.email}</span>
                  </div>
                  <ChevronsUpDownIcon className="ml-auto size-4"/>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? 'bottom' : 'right'}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">{getInitials(owner?.username ?? '')}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{owner?.username}</span>
                      <span className="truncate text-xs">{owner?.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                {owner?.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator/>
                    <DropdownMenuGroup>
                      <DropdownMenuItem>
                        <Bolt/>
                        管理中心
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </>
                )}
                <DropdownMenuSeparator/>
                <DropdownMenuItem onClick={() => handleLogout()}>
                  <LogOutIcon/>
                  登出
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail/>
    </Sidebar>
  )
}
