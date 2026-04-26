'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useAgent } from '@/hooks/use-chat';

export default function ChatIndexPage() {
  const params = useParams();
  const agent = params.agent as string;
  const router = useRouter();

  const { data: agents } = useAgent();

  const agent_name = useMemo(() => {
    return (agents ?? []).map(o => o.name);
  }, [agents]);

  useEffect(() => {
    // 确保数据已加载
    if (agent_name.length === 0) return;

    // 情况 A：用户直接访问 /chat (没有 graph 参数)
    if (!agent) {
      router.replace(`/chat/${agent_name[0]}`);
      return;
    }

    // 情况 B：用户访问了不存在的 agent，例如 /chat/wrong_name
    if (!agent_name.includes(agent)) {
      router.replace(`/chat/${agent_name[0]}`);
    }
  }, [ agent, agent_name, router ]);

  return (
    <div className="flex items-center justify-center h-screen text-slate-400">
      正在初始化聊天环境...
    </div>
  );
}
