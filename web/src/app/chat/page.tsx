'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useGraph } from '@/hooks/use-chat';

export default function ChatIndexPage() {
  const params = useParams();
  const graph = params.graph as string;
  const router = useRouter();

  const { data: graphs } = useGraph();
  const graph_name = useMemo(() => {
    return (graphs ?? []).map(o => o.name);
  }, [graphs]);

  useEffect(() => {
    // 确保数据已加载
    if (graph_name.length === 0) return;

    // 情况 A：用户直接访问 /chat (没有 graph 参数)
    if (!graph) {
      router.replace(`/chat/${graph_name[0]}`);
      return;
    }

    // 情况 B：用户访问了不存在的 graph，例如 /chat/wrong_name
    if (!graph_name.includes(graph)) {
      router.replace(`/chat/${graph_name[0]}`);
    }
  }, [ graph, graph_name, router ]);

  return (
    <div className="flex items-center justify-center h-screen text-slate-400">
      正在初始化聊天环境...
    </div>
  );
}
