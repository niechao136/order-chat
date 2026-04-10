'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  getColList,
  getColInfo,
  addCol,
  deleteCol,
  getRecordList,
  searchRecord,
  addRecord,
  updateRecord,
  deleteRecord,
  batchDeleteRecord,
  clearCol,
  getRecordInfo,
  uploadRecord,
} from '@/services/dataset';
import { PageParams } from '@/types/api';


export const datasetKeys = {
  all: ['dataset'] as const,
  lists: () => [...datasetKeys.all, 'list'] as const,
  details: () => [...datasetKeys.all, 'detail'] as const,
  detail: (name: string) => [...datasetKeys.details(), name] as const,
  records: (colName: string) => [...datasetKeys.all, colName, 'records'] as const,
  recordLists: (colName: string) => [...datasetKeys.records(colName), 'list'] as const,
  recordList: (colName: string, params?: PageParams) => [...datasetKeys.recordLists(colName), params] as const,
  recordDetails: (colName: string) => [...datasetKeys.records(colName), 'detail'] as const,
  recordDetail: (colName: string, id: string) => [...datasetKeys.recordDetails(colName), id] as const,
};

export function useColList() {
  return useQuery({
    queryKey: datasetKeys.lists(),
    queryFn: () => getColList().then(res => res.data),
    staleTime: 1000 * 60 * 5, // 管理后台数据相对稳定，可以设置较长过期时间
  });
}

export function useColInfo(name: string) {
  return useQuery({
    queryKey: datasetKeys.detail(name),
    queryFn: () => getColInfo(name).then(res => res.data),
    enabled: !!name, // 只有当 name 存在时才发起请求
  });
}

export function useColAction() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: addCol,
    onSuccess: async (res) => {
      if (res.status === 1) {
        await queryClient.invalidateQueries({ queryKey: datasetKeys.lists() });
      } else {
        throw new Error(res?.msg)
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCol,
    onSuccess: async (res) => {
      if (res.status === 1) {
        await queryClient.invalidateQueries({ queryKey: datasetKeys.lists() });
      } else {
        throw new Error(res?.msg)
      }
    },
  });

  return {
    addCol: addMutation.mutate,
    isAdding: addMutation.isPending,
    deleteCol: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}


export function useRecordList(name: string, params?: PageParams) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: datasetKeys.recordList(name, params),
    queryFn: () => getRecordList(name, params),
    placeholderData: (previousData) => previousData, // 翻页时保留旧数据，避免白屏
  });

  useEffect(() => {
    if (query.data?.data) {
      // 循环列表中的每一条 record
      query.data.data.forEach((record) => {
        // 手动设置详情缓存
        queryClient.setQueryData(datasetKeys.recordDetail(name, record.id), record);
      });
    }
  }, [ query.data, name, queryClient ])

  return query
}

export function useRecordInfo(name: string, id: string) {
  return useQuery({
    queryKey: datasetKeys.recordDetail(name, id),
    queryFn: () => getRecordInfo(name, id).then(res => res.data),
    enabled: !!name && !!id,
  });
}

export function useRecordActions(colName: string, params?: PageParams) {
  const queryClient = useQueryClient();

  // 通用的刷新函数：刷新该集合下的所有列表（分页、搜索等）
  const refreshLists = async () => {
    await queryClient.invalidateQueries({ queryKey: datasetKeys.recordList(colName, params) });
  };

  // 1. 新增
  const add = useMutation({
    mutationFn: (body: string) => addRecord(colName, body),
    onSuccess: async (res) => {
      if (res.status === 1) {
        await refreshLists();
      } else {
        throw new Error(res?.msg)
      }
    },
  });

  // 2. 修改
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      updateRecord(colName, id, body),
    onSuccess: async (res) => {
      if (res.status === 1) {
        await refreshLists();
      } else {
        throw new Error(res?.msg)
      }
    },
  });

  // 3. 删除/批量删除
  const remove = useMutation({
    mutationFn: (id: string) => deleteRecord(colName, id),
    onSuccess: async (res) => {
      if (res.status === 1) {
        await refreshLists();
      } else {
        throw new Error(res?.msg)
      }
    },
  });

  const batchRemove = useMutation({
    mutationFn: (ids: string[]) => batchDeleteRecord(colName, JSON.stringify({ ids })),
    onSuccess: async (res) => {
      if (res.status === 1) {
        await refreshLists();
      } else {
        throw new Error(res?.msg)
      }
    },
  });

  // 4. 清空集合
  const clear = useMutation({
    mutationFn: () => clearCol(colName),
    onSuccess: async (res) => {
      if (res.status === 1) {
        await refreshLists();
      } else {
        throw new Error(res?.msg)
      }
    },
  });

  const upload = useMutation({
    mutationFn: (body: FormData) => uploadRecord(colName, body),
    onSuccess: async (res) => {
      if (res.status === 1) {
        await refreshLists();
      } else {
        throw new Error(res?.msg)
      }
    }
  });

  const search = useMutation({
    mutationFn: ({ text, top_k }: {
      text: string;
      top_k: number;
    }) => searchRecord(colName, JSON.stringify({ text, top_k })),
  });

  return {
    add,
    update,
    remove,
    batchRemove,
    clear,
    upload,
    search,
  };
}
