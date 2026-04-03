import * as React from 'react';

import { ChatSidebar } from '@/components/chat/sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'

export default function ChatLayout({ children, params }: {
  children: React.ReactNode;
  params: { graph: string };
}) {
  return (
    <SidebarProvider>
      <ChatSidebar graph={params.graph}/>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
