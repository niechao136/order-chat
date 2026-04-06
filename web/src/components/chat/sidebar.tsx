'use client';

import { useParams } from 'next/navigation';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from '@/components/ui/sidebar';
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

      </SidebarContent>
      <SidebarFooter>

      </SidebarFooter>
      <SidebarRail/>
    </Sidebar>
  )
}
