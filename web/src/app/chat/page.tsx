'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useGraph } from '@/hooks/use-query';

export default function ChatIndexPage() {
  const params = useParams();
  const graph = params.graph as string;
  const router = useRouter();

  const { data: graphs } = useGraph();

  useEffect(() => {
    // 确保数据已加载
    if (!graphs || !Array.isArray(graphs) || graphs.length === 0) return;

    // 情况 A：用户直接访问 /chat (没有 graph 参数)
    if (!graph) {
      router.replace(`/chat/${graphs[0]}`);
      return;
    }

    // 情况 B：用户访问了不存在的 graph，例如 /chat/wrong_name
    if (!graphs.includes(graph)) {
      router.replace(`/chat/${graphs[0]}`);
    }
  }, [ graph, graphs, router ]);

  return (
    <div className="flex items-center justify-center h-screen text-slate-400">
      正在初始化聊天环境...
    </div>
  );
}
