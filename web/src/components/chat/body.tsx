'use client';

import { useState, useEffect, ReactNode } from 'react';

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
import { useGlobal } from '@/context/global-context';
import { getThreadList } from '@/services/chat'
import { ChatThread } from '@/types/chat'
import { UserInfo } from '@/types/user'

export function ChatBody({ children }: {
  children: ReactNode;
}) {
  const params = useParams();
  const graph = params.graph as string;
  const thread_id = params.thread_id as string;

  const [ graphs, setGraphs ] = useState<string[]>([]);
  const [ threads, setThreads ] = useState<ChatThread[]>([]);
  const [ owner, setOwner ] = useState<UserInfo | null>(null);
  const def_title = '欢迎提问'
  const [ title, setTitle ] = useState<string>(def_title);
  const { getGraph, getOwner } = useGlobal()

  useEffect(() => {
    const abort = new AbortController()

    const fetchData = async () => {
      const graph_arr = await getGraph()
      setGraphs(graph_arr)

      const owner = await getOwner()
      setOwner(owner)

      const res_t = await getThreadList(graph, abort)

      setThreads(res_t.data)
      setTitle(!!thread_id ? res_t.data.find(o => o.thread_id === thread_id)?.summary ?? def_title : def_title)
    }

    fetchData().then()

    return () => {
      abort.abort('页面注销')
    }
  }, [getGraph, getOwner, graph, thread_id])

  return (
    <SidebarProvider>
      <ChatSidebar
        graphs={graphs}
        owner={owner}
        threads={threads}
      />
      <SidebarInset>
        <header
          className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
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
        <main>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
