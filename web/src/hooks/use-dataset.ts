'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  addDataset,
  addPoint,
  clearDataset,
  deleteDataset,
  deletePoints,
  getAllPoints,
  getBatchPoints,
  getDatasetList,
  getDatasetInfo,
  getFieldList,
  getPointCount,
  getPointInfo,
  getPointList,
  searchPoints,
  setFieldList,
  updatePoint,
  uploadPoints,
} from '@/services/dataset';
import { usePagingStore } from '@/stores/paging';
import { PageParams } from '@/types/api';
import { FieldItem, FilterCondition } from '@/types/dataset';


export const datasetKeys = {
  all: ['dataset'] as const,
  lists: () => [...datasetKeys.all, 'list'] as const,
  details: () => [...datasetKeys.all, 'detail'] as const,
  detail: (name: string) => [...datasetKeys.details(), name] as const,
  points: (colName: string) => [...datasetKeys.all, colName, 'points'] as const,
  pointFields: (colName: string) => [...datasetKeys.points(colName), 'field'] as const,
  pointLists: (colName: string) => [...datasetKeys.points(colName), 'list'] as const,
  pointList: (colName: string, params?: PageParams) => [...datasetKeys.pointLists(colName), params] as const,
  pointDetails: (colName: string) => [...datasetKeys.points(colName), 'detail'] as const,
  pointDetail: (colName: string, id: string) => [...datasetKeys.pointDetails(colName), id] as const,
};

export function useDatasetList() {
  return useQuery({
    queryKey: datasetKeys.lists(),
    queryFn: () => getDatasetList().then(res => res.data),
    staleTime: 1000 * 60 * 10,
  });
}

export function useDatasetInfo(name: string) {
  return useQuery({
    queryKey: datasetKeys.detail(name),
    queryFn: () => getDatasetInfo(name).then(res => res.data),
    enabled: !!name, // 只有当 name 存在时才发起请求
    staleTime: 1000 * 60 * 10,
  });
}

export function useDatasetAction() {
  const queryClient = useQueryClient();

  const refresh = async (name: string) => {
    await queryClient.invalidateQueries({ queryKey: datasetKeys.lists() });
    await queryClient.invalidateQueries({
      queryKey: datasetKeys.points(name),
      exact: false
    });
  };

  const add = useMutation({
    mutationFn: addDataset,
    onSuccess: async (res) => {
      if (res.status !== 1) {
        throw new Error(res?.msg);
      }
    },
  });

  const remove = useMutation({
    mutationFn: deleteDataset,
    onSuccess: async (res) => {
      if (res.status !== 1) {
        throw new Error(res?.msg);
      }
    },
  });

  return {
    add,
    remove,
    refresh,
  };
}


export function usePointList(name: string, params?: PageParams) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: datasetKeys.pointList(name, params),
    queryFn: () => getPointList(name, params),
    enabled: !!name,
    placeholderData: (previousData) => previousData
  });

  useEffect(() => {
    if (query.data?.data) {
      // 循环列表中的每一条 record
      query.data.data.forEach((record) => {
        // 手动设置详情缓存
        queryClient.setQueryData(datasetKeys.pointDetail(name, record.id), record);
      });
    }
  }, [ query.data, name, queryClient ]);

  return query;
}

export function usePointInfo(name: string, id: string) {
  return useQuery({
    queryKey: datasetKeys.pointDetail(name, id),
    queryFn: () => getPointInfo(name, id).then(res => res.data),
    enabled: !!name && !!id,
  });
}

export function usePointField(name: string) {
  return useQuery({
    queryKey: datasetKeys.pointFields(name),
    queryFn: () => getFieldList(name).then(res => res.data),
    enabled: !!name,
  });
}

export function usePointActions(name: string) {
  const queryClient = useQueryClient();
  const pagingKey = `dataset_${name}`;
  const { page, size } = usePagingStore((state) => state.getPaging(pagingKey));
  const { setPage, initPaging } = usePagingStore();

  useEffect(() => {
    initPaging(pagingKey);
  }, [initPaging, pagingKey]);

  // 新增/修改/批量生成后跳转到最后一页，看到最新的数据
  const jumpToLast = async () => {
    await queryClient.invalidateQueries({
      queryKey: datasetKeys.pointLists(name),
      exact: false
    });
    const data = await getPointCount(name);
    const total = data?.data || 0;
    const totalPage = Math.ceil(total / size) || 1;
    setPage(pagingKey, totalPage);
  };

  // 删除/批量删除/清空后检查当前页码是否大于总页码
  const checkPage = async () => {
    await queryClient.invalidateQueries({
      queryKey: datasetKeys.pointLists(name),
      exact: false
    });
    const data = await getPointCount(name);
    const total = data?.data || 0;
    const totalPage = Math.ceil(total / size) || 1;
    const cur = page > totalPage ? totalPage : page;
    setPage(pagingKey, cur);
  };

  const refreshField = async () => {
    await queryClient.invalidateQueries({
      queryKey: datasetKeys.pointFields(name)
    });
  }

  // 新增
  const add = useMutation({
    mutationFn: (body: string) => addPoint(name, body),
    onSuccess: async (res) => {
      if (res.status !== 1) {
        throw new Error(res?.msg);
      }
    },
  });

  // 修改
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      updatePoint(name, id, body),
    onSuccess: async (res) => {
      if (res.status !== 1) {
        throw new Error(res?.msg);
      }
    },
  });

  // 删除/批量删除
  const remove = useMutation({
    mutationFn: (ids: string[]) => deletePoints(name, JSON.stringify({ ids })),
    onSuccess: async (res) => {
      if (res.status !== 1) {
        throw new Error(res?.msg);
      }
    },
  });

  // 清空集合
  const clear = useMutation({
    mutationFn: () => clearDataset(name),
    onSuccess: async (res) => {
      if (res.status !== 1) {
        throw new Error(res?.msg);
      }
    },
  });

  // 批量上传
  const upload = useMutation({
    mutationFn: (body: string) => uploadPoints(name, body),
    onSuccess: async (res) => {
      if (res.status !== 1) {
        throw new Error(res?.msg);
      }
    }
  });

  // 导出全部
  const exportAll = useMutation({
    mutationFn: () => getAllPoints(name),
  });

  // 导出全部
  const exportBatch = useMutation({
    mutationFn: (ids: string[]) => getBatchPoints(name, JSON.stringify({ ids })),
  });

  // 检索测试
  const search = useMutation({
    mutationFn: ({ text, top_k, filters }: {
      text: string;
      top_k: number;
      filters: FilterCondition[]
    }) => searchPoints(name, JSON.stringify({ text, top_k, filters })),
  });

  // 设定栏位
  const setField = useMutation({
    mutationFn: (list: FieldItem[]) => setFieldList(name, JSON.stringify(list)),
  });

  return {
    add,
    update,
    remove,
    clear,
    upload,
    exportAll,
    exportBatch,
    search,
    setField,
    jumpToLast,
    checkPage,
    refreshField,
  };
}
