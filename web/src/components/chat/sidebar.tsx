'use client';

import { PlusIcon } from 'lucide-react';

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
import { AgentSwitch } from '@/components/chat/agent-switch';
import { ChatConversation } from '@/types/chat';
import { UserInfo } from '@/types/user';

export function ChatSidebar({ agents, owner, conversations }: {
  agents: string[]
  owner: UserInfo | null
  conversations: ChatConversation[]
}) {
  const params = useParams();
  const agent = params.agent as string;

  return (
    <Sidebar>
      <SidebarHeader>
        <AgentSwitch agents={agents} active={agent}/>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href={`/chat/${agent}`}>
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
            {conversations.map((conversation) => (
              <SidebarMenuItem key={conversation.conversation_id}>
                <SidebarMenuButton asChild>
                  <Link href={`/chat/${agent}/${conversation.conversation_id}`}>
                    <span>{conversation.summary}</span>
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
  );
}
