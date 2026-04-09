'use client';

import { PlusIcon } from 'lucide-react'

import Link from 'next/link';
import { useParams } from 'next/navigation';

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
} from '@/components/ui/sidebar';
import { NavUser } from '@/components/base/nav-user';
import { GraphSwitch } from '@/components/chat/graph-switch';
import { ChatThread } from '@/types/chat';
import { UserInfo } from '@/types/user';

export function ChatSidebar({ graphs, owner, threads }: {
  graphs: string[]
  owner: UserInfo | null
  threads: ChatThread[]
}) {
  const params = useParams();
  const graph = params.graph as string;

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
                <Link href={`/chat/${graph}`}>
                  <PlusIcon />
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
                  <Link href={`/chat/${graph}/${thread.thread_id}`}>
                    <span>{thread.summary}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser mode={'chat'} owner={owner}/>
      </SidebarFooter>
      <SidebarRail/>
    </Sidebar>
  )
}
