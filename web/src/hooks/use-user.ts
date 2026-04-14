'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  addUser,
  changeOwnerPwd,
  changeUserPwd,
  getUserInfo,
  getUserList,
  getOwnerInfo,
  updateUser,
} from '@/services/user';
import { PageParams } from '@/types/api';



export const userKeys = {
  all: [ 'user' ] as const,
  lists: () => [ ...userKeys.all, 'list' ] as const,
  list: (params?: PageParams) => [ ...userKeys.lists(), params ] as const,
  owner: () => [ ...userKeys.all, 'owner' ] as const,
  details: () => [ ...userKeys.all, 'detail' ] as const,
  detail: (id: string) => [ ...userKeys.details(), id ] as const,
}

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
    queryFn: () => getUserList(params)
  })

  useEffect(() => {
    if (query.data?.data) {
      // 循环列表中的每一条 record
      query.data.data.forEach((user) => {
        // 手动设置详情缓存
        queryClient.setQueryData(userKeys.detail(user.id), user);
      });
    }
  }, [ query.data, queryClient ])

  return query
}

export function useUserInfo(user_id: string) {
  return useQuery({
    queryKey: userKeys.detail(user_id),
    queryFn: () => getUserInfo(user_id).then(res => res.data),
    enabled: !!user_id,
  })
}

export function useUserAction(params?: PageParams) {
  const queryClient = useQueryClient();

  const refreshList = async () => {
    await queryClient.invalidateQueries({ queryKey: userKeys.list(params) });
  };

  const add = useMutation({
    mutationFn: (body: string) => addUser(body),
    onSuccess: async () => {
      await refreshList();
    },
  });

  const update = useMutation({
    mutationFn: ({ user_id, body }: {
      user_id: string;
      body: string;
    }) => updateUser(user_id, body),
    onSuccess: async () => {
      await refreshList();
    },
  });

  const change = useMutation({
    mutationFn: ({ user_id, password }: {
      user_id: string,
      password: string,
    }) => changeUserPwd(user_id, JSON.stringify({ password })),
  });

  const changeMe = useMutation({
    mutationFn: ({ password }: {
      password: string;
    }) => changeOwnerPwd(JSON.stringify({ password })),
    onSuccess: (res) => {
      if (res?.status !== 1) {
        throw new Error(res?.msg)
      }
    },
  });

  return {
    add,
    update,
    change,
    changeMe,
  }
}

