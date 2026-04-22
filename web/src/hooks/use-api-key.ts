'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';

import { addApiKey, deleteApiKey, getApiKeyCount, getApiKeyList, toggleApiKey } from '@/services/api-key';
import { usePagingStore } from '@/stores/paging';
import { PageParams } from '@/types/api';


export const apiKeys = {
  all: [ 'api-key' ] as const,
  lists: () => [ ...apiKeys.all, 'list' ] as const,
  list: (params?: PageParams) => [ ...apiKeys.lists(), params ] as const,
  count: () => [ ...apiKeys.lists(), 'count' ] as const
};

export function useApiKey(params?: PageParams) {
  return useQuery({
    queryKey: apiKeys.list(params),
    queryFn: () => getApiKeyList(),
    placeholderData: (previousData) => previousData
  });
}

export function useApiKeyAction() {
  const queryClient = useQueryClient();
  const pagingKey = 'api-key';
  const { page, size } = usePagingStore((state) => state.getPaging(pagingKey));
  const { setPage, setSort, setSearch, initPaging } = usePagingStore();

  useEffect(() => {
    initPaging(pagingKey);
  }, [ initPaging, pagingKey ]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: apiKeys.lists() });
  };

  const jumpToFirst = async () => {
    await queryClient.invalidateQueries({
      queryKey: apiKeys.lists(),
      exact: false
    });
    setSort(pagingKey, 'created_at', 'desc');
    setSearch(pagingKey, '');
    setPage(pagingKey, 1);
  };

  const checkPage = async () => {
    await queryClient.invalidateQueries({
      queryKey: apiKeys.lists(),
      exact: false
    });
    const total = await fetchCount();
    const totalPage = Math.ceil((total || 0) / size) || 1;
    const cur = page > totalPage ? totalPage : page;
    setPage(pagingKey, cur);
  };

  const add = useMutation({
    mutationFn: addApiKey,
    onSuccess: async (res) => {
      if (res.status !== 1) {
        throw new Error(res?.msg);
      }
    }
  });

  const remove = useMutation({
    mutationFn: (ids: string[]) => deleteApiKey(JSON.stringify({ ids })),
    onSuccess: async (res) => {
      if (res.status !== 1) {
        throw new Error(res?.msg);
      }
    }
  });

  const toggle = useMutation({
    mutationFn: ({ key_id, is_active }: {
      is_active: boolean
      key_id: string
    }) => toggleApiKey(key_id, JSON.stringify({ is_active })),
    onSuccess: async (res) => {
      if (res.status !== 1) {
        throw new Error(res?.msg);
      }
    }
  });

  const fetchCount = async () => {
    return await queryClient.fetchQuery({
      queryKey: apiKeys.count(),
      queryFn: () => getApiKeyCount().then(res => res.data),
      staleTime: 0
    })
  };

  return {
    add,
    remove,
    toggle,
    refresh,
    checkPage,
    jumpToFirst,
  };
}
