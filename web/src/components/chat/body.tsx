'use client';

import { useEffect, useMemo, ReactNode } from 'react';

import { useParams } from 'next/navigation';

import { ChatSidebar } from '@/components/chat/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { useAgent, useConversations } from '@/hooks/use-chat';
import { useOwner } from '@/hooks/use-user';
import { useChatStore } from '@/stores/chat';

export function ChatBody({ children }: {
  children: ReactNode;
}) {
  const params = useParams();
  const agent = params.agent as string;
  const conversation_id = params.conversation_id as string;

  const setConversationId = useChatStore((s) => s.setConversationId);

  useEffect(() => {
    setConversationId(conversation_id ?? null);
  }, [conversation_id, setConversationId]);

  const { data: agents } = useAgent();
  const agent_name = useMemo(() => {
    return (agents ?? []).map(o => o.name);
  }, [agents]);

  const { data: owner } = useOwner();
  const { data: conversations } = useConversations(agent ?? '', agent_name ?? []);
  const title = useMemo(() => {
    const def_title = '欢迎提问';
    if (!conversation_id || !conversations) return def_title;

    // 从已有的 conversations 缓存中查找匹配项
    const currentConversation = conversations.find(o => o.conversation_id === conversation_id);
    return currentConversation?.summary ?? def_title;
  }, [conversations, conversation_id]);

  return (
    <SidebarProvider>
      <ChatSidebar
        agents={agent_name ?? []}
        owner={owner ?? null}
        conversations={conversations ?? []}
      />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <header
          className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1"/>
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4 data-vertical:self-center"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
