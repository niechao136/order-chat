'use client';

import Cookies from 'js-cookie';
import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { Sidebar } from '@/components/ui/sidebar';

export function ChatSidebar({ graph }: { graph: string }) {
   const router = useRouter();
  const [graphs, setGraphs] = useState<string[]>([]);
  const [threads, setThreads] = useState([]);

  useEffect(() => {
    const token = Cookies.get("token")
    if (!token) {
      router.push('/login')
    }
    const fetchGraph = async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data: string[] = await res.json();
      setGraphs(data);
    }
  }, [graph])

  return (<></>)
}
