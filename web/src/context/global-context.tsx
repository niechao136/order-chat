'use client';

import * as React from 'react'
import { createContext, useContext, useState, useCallback, useRef } from 'react'

import { getGraphList } from '@/services/chat'
import { getOwnerInfo } from '@/services/user'
import { UserInfo } from '@/types/user'

interface IGlobalContext {
  graph: string[]
  getGraph: () => Promise<string[]>
  owner: UserInfo | null
  getOwner: () => Promise<UserInfo | null>
}

const GlobalContext = createContext<IGlobalContext | undefined>(undefined)


export function GlobalProvider({ children }: { children: React.ReactNode }) {
  const [ graph, setGraph ] = useState<string[]>([]);
  const [ owner, setOwner ] = useState<UserInfo | null>(null);
  const graphRef = useRef<string[]>([]);
  const ownerRef = useRef<UserInfo | null>(null);

  const getGraph = useCallback(async () => {
    if (graphRef.current.length === 0) {
      const arr = await getGraphList()
      setGraph(arr)
      graphRef.current = arr
    }
    return graphRef.current
  }, [])
  const getOwner = useCallback(async () => {
    if (!ownerRef.current) {
      const res = await getOwnerInfo()
      console.log(res)
      setOwner(res?.data ?? null)
      ownerRef.current = res?.data ?? null
    }
    return ownerRef.current
  }, [])

  return (
    <GlobalContext.Provider value={{ graph, getGraph, owner, getOwner }}>
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobal() {
  const context = useContext(GlobalContext);
  if (!context) throw new Error('useGlobal must be used within an GlobalProvider');
  return context;
}
