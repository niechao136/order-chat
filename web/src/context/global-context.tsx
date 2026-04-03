'use client';

import * as React from 'react'
import { createContext, useContext, useState, useCallback } from 'react'

import { getGraphList } from '@/services/chat'


interface IGlobalContext {
  graph: string[]
  getGraph: () => Promise<string[]>
}

const GlobalContext = createContext<IGlobalContext | undefined>(undefined)


export function GlobalProvider({ children }: { children: React.ReactNode }) {
  const [ graph, setGraph ] = useState<string[]>([]);

  const getGraph = useCallback(async () => {
    if (graph.length === 0) {
      const arr = await getGraphList()
      setGraph(arr)
      return arr
    }
    return graph
  }, [graph])

  return (
    <GlobalContext.Provider value={{ graph, getGraph }}>
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobal() {
  const context = useContext(GlobalContext);
  if (!context) throw new Error('useGlobal must be used within an GlobalProvider');
  return context;
}
