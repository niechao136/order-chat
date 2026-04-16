'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  addUser,
  changeOwnerPwd,
  changeUserPwd,
  deleteUser,
  getUserInfo,
  getUserList,
  getUserCount,
  getOwnerInfo,
  updateUser,
} from '@/services/user';
import { usePagingStore } from '@/stores/paging';
import { PageParams } from '@/types/api';


export const userKeys = {
  all: [ 'user' ] as const,
  lists: () => [ ...userKeys.all, 'list' ] as const,
  list: (params?: PageParams) => [ ...userKeys.lists(), params ] as const,
  count: () => [ ...userKeys.lists(), 'count' ] as const,
  owner: () => [ ...userKeys.all, 'owner' ] as const,
  details: () => [ ...userKeys.all, 'detail' ] as const,
  detail: (id: string) => [ ...userKeys.details(), id ] as const,
};

export function useOwner() {
  return useQuery({
    queryKey: userKeys.owner(),
    queryFn: () => getOwnerInfo().then(res => res.data),
    staleTime: 1000 * 60 * 10
  });
}

export function useUserList(params?: PageParams) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => getUserList(params),
    placeholderData: (previousData) => previousData
  });

  useEffect(() => {
    if (query.data?.data) {
      // 循环列表中的每一条 record
      query.data.data.forEach((user) => {
        // 手动设置详情缓存
        queryClient.setQueryData(userKeys.detail(user.id), user);
      });
    }
  }, [ query.data, queryClient ]);

  return query;
}

export function useUserCount() {
  return useQuery({
    queryKey: userKeys.count(),
    queryFn: () => getUserCount().then(res => res.data)
  });
}

export function useUserInfo(user_id: string) {
  return useQuery({
    queryKey: userKeys.detail(user_id),
    queryFn: () => getUserInfo(user_id).then(res => res.data),
    enabled: !!user_id,
  });
}

export function useUserAction() {
  const queryClient = useQueryClient();
  const pagingKey = 'user';
  const { page, size } = usePagingStore((state) => state.getPaging(pagingKey));
  const { setPage, setSort, setSearch, initPaging } = usePagingStore();

  useEffect(() => {
    initPaging(pagingKey);
  }, [initPaging, pagingKey]);

  const jumpToFirst = async () => {
    await queryClient.invalidateQueries({
      queryKey: userKeys.lists(),
      exact: false
    });
    setSort(pagingKey, 'updated_at', 'desc');
    setSearch(pagingKey, '');
    setPage(pagingKey, 1);
  };

  const checkPage = async () => {
    await queryClient.invalidateQueries({
      queryKey: userKeys.lists(),
      exact: false
    });
    const total = await fetchCount();
    const totalPage = Math.ceil((total || 0) / size) || 1;
    const cur = page > totalPage ? totalPage : page;
    setPage(pagingKey, cur);
  };

  const add = useMutation({
    mutationFn: (body: string) => addUser(body),
    onSuccess: async (res) => {
      if (res?.status !== 1) {
        throw new Error(res?.msg);
      }
    },
  });

  const update = useMutation({
    mutationFn: ({ user_id, body }: {
      user_id: string;
      body: string;
    }) => updateUser(user_id, body),
    onSuccess: async (res) => {
      if (res?.status !== 1) {
        throw new Error(res?.msg);
      }
    },
  });

  const remove = useMutation({
    mutationFn: (ids: string[]) => deleteUser(JSON.stringify({ ids })),
    onSuccess: async (res) => {
      if (res?.status !== 1) {
        throw new Error(res?.msg);
      }
    },
  });

  const change = useMutation({
    mutationFn: ({ user_id, password }: {
      user_id: string,
      password: string,
    }) => changeUserPwd(user_id, JSON.stringify({ password })),
    onSuccess: async (res) => {
      if (res?.status !== 1) {
        throw new Error(res?.msg);
      }
    }
  });

  const changeMe = useMutation({
    mutationFn: ({ password }: {
      password: string;
    }) => changeOwnerPwd(JSON.stringify({ password })),
    onSuccess: (res) => {
      if (res?.status !== 1) {
        throw new Error(res?.msg);
      }
    },
  });

  const fetchCount = async () => {
    return await queryClient.fetchQuery({
      queryKey: userKeys.count(),
      queryFn: () => getUserCount().then(res => res.data),
      staleTime: 0
    })
  };

  return {
    add,
    update,
    remove,
    change,
    changeMe,
    checkPage,
    jumpToFirst,
  }
}
