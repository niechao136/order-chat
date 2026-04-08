import * as React from 'react';

import { ChatBody } from '@/components/chat/body';

export default async function ChatLayout({ children }: {
  children: React.ReactNode;
}) {
  return (
    <ChatBody>{children}</ChatBody>
  )
}
