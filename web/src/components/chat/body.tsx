'use client';

import { useMemo, ReactNode } from 'react';

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
import { useGraph, useOwner, useThreads } from '@/hooks/use-query';

export function ChatBody({ children }: {
  children: ReactNode;
}) {
  const params = useParams();
  const graph = params.graph as string;
  const thread_id = params.thread_id as string;

  const { data: graphs } = useGraph();
  const { data: owner } = useOwner();
  const { data: threads } = useThreads(graph ?? '', graphs ?? []);
  const title = useMemo(() => {
    const def_title = '欢迎提问';
    if (!thread_id || !threads) return def_title;

    // 从已有的 threads 缓存中查找匹配项
    const currentThread = threads.find(o => o.thread_id === thread_id);
    return currentThread?.summary ?? def_title;
  }, [threads, thread_id]);

  return (
    <SidebarProvider>
      <ChatSidebar
        graphs={graphs ?? []}
        owner={owner ?? null}
        threads={threads ?? []}
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
  )
}
