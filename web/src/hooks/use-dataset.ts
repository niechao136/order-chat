'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  getColList,
  getColInfo,
  addCol,
  deleteCol,
  getRecordList,
  getRecordCount,
  searchRecord,
  addRecord,
  updateRecord,
  deleteRecord,
  clearCol,
  getRecordInfo,
  uploadRecord,
  getAllRecord,
  getBatchRecord,
  getFieldList,
  setFieldList,
} from '@/services/dataset';
import { usePagingStore } from '@/stores/paging';
import { PageParams } from '@/types/api';
import { FieldItem, FilterCondition } from '@/types/dataset';


export const datasetKeys = {
  all: ['dataset'] as const,
  lists: () => [...datasetKeys.all, 'list'] as const,
  details: () => [...datasetKeys.all, 'detail'] as const,
  detail: (name: string) => [...datasetKeys.details(), name] as const,
  records: (colName: string) => [...datasetKeys.all, colName, 'records'] as const,
  recordFields: (colName: string) => [...datasetKeys.records(colName), 'field'] as const,
  recordLists: (colName: string) => [...datasetKeys.records(colName), 'list'] as const,
  recordList: (colName: string, params?: PageParams) => [...datasetKeys.recordLists(colName), params] as const,
  recordDetails: (colName: string) => [...datasetKeys.records(colName), 'detail'] as const,
  recordDetail: (colName: string, id: string) => [...datasetKeys.recordDetails(colName), id] as const,
};

export function useColList() {
  return useQuery({
    queryKey: datasetKeys.lists(),
    queryFn: () => getColList().then(res => res.data),
    staleTime: 1000 * 60 * 10,
  });
}

export function useColInfo(name: string) {
  return useQuery({
    queryKey: datasetKeys.detail(name),
    queryFn: () => getColInfo(name).then(res => res.data),
    enabled: !!name, // 只有当 name 存在时才发起请求
    staleTime: 1000 * 60 * 10,
  });
}

export function useColAction() {
  const queryClient = useQueryClient();

  const refresh = async (name: string) => {
    await queryClient.invalidateQueries({ queryKey: datasetKeys.lists() });
    await queryClient.invalidateQueries({
      queryKey: datasetKeys.recordLists(name),
      exact: false
    });
  };

  const add = useMutation({
    mutationFn: addCol,
    onSuccess: async (res) => {
      if (res.status !== 1) {
        throw new Error(res?.msg);
      }
    },
  });

  const remove = useMutation({
    mutationFn: deleteCol,
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


export function useRecordList(name: string, params?: PageParams) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: datasetKeys.recordList(name, params),
    queryFn: () => getRecordList(name, params),
    enabled: !!name,
    placeholderData: (previousData) => previousData
  });

  useEffect(() => {
    if (query.data?.data) {
      // 循环列表中的每一条 record
      query.data.data.forEach((record) => {
        // 手动设置详情缓存
        queryClient.setQueryData(datasetKeys.recordDetail(name, record.id), record);
      });
    }
  }, [ query.data, name, queryClient ]);

  return query;
}

export function useRecordInfo(name: string, id: string) {
  return useQuery({
    queryKey: datasetKeys.recordDetail(name, id),
    queryFn: () => getRecordInfo(name, id).then(res => res.data),
    enabled: !!name && !!id,
  });
}

export function useRecordField(name: string) {
  return useQuery({
    queryKey: datasetKeys.recordFields(name),
    queryFn: () => getFieldList(name).then(res => res.data),
    enabled: !!name,
  });
}

export function useRecordActions(colName: string) {
  const queryClient = useQueryClient();
  const pagingKey = `dataset_${colName}`;
  const { page, size } = usePagingStore((state) => state.getPaging(pagingKey));
  const { setPage, initPaging } = usePagingStore();

  useEffect(() => {
    initPaging(pagingKey);
  }, [initPaging, pagingKey]);

  // 新增/修改/批量生成后跳转到最后一页，看到最新的数据
  const jumpToLast = async () => {
    await queryClient.invalidateQueries({
      queryKey: datasetKeys.recordLists(colName),
      exact: false
    });
    const data = await getRecordCount(colName);
    const total = data?.data || 0;
    const totalPage = Math.ceil(total / size) || 1;
    setPage(pagingKey, totalPage);
  };

  // 删除/批量删除/清空后检查当前页码是否大于总页码
  const checkPage = async () => {
    await queryClient.invalidateQueries({
      queryKey: datasetKeys.recordLists(colName),
      exact: false
    });
    const data = await getRecordCount(colName);
    const total = data?.data || 0;
    const totalPage = Math.ceil(total / size) || 1;
    const cur = page > totalPage ? totalPage : page;
    setPage(pagingKey, cur);
  };

  const refreshField = async () => {
    await queryClient.invalidateQueries({
      queryKey: datasetKeys.recordFields(colName)
    });
  }

  // 新增
  const add = useMutation({
    mutationFn: (body: string) => addRecord(colName, body),
    onSuccess: async (res) => {
      if (res.status !== 1) {
        throw new Error(res?.msg);
      }
    },
  });

  // 修改
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      updateRecord(colName, id, body),
    onSuccess: async (res) => {
      if (res.status !== 1) {
        throw new Error(res?.msg);
      }
    },
  });

  // 删除/批量删除
  const remove = useMutation({
    mutationFn: (ids: string[]) => deleteRecord(colName, JSON.stringify({ ids })),
    onSuccess: async (res) => {
      if (res.status !== 1) {
        throw new Error(res?.msg);
      }
    },
  });

  // 清空集合
  const clear = useMutation({
    mutationFn: () => clearCol(colName),
    onSuccess: async (res) => {
      if (res.status !== 1) {
        throw new Error(res?.msg);
      }
    },
  });

  // 批量上传
  const upload = useMutation({
    mutationFn: (body: string) => uploadRecord(colName, body),
    onSuccess: async (res) => {
      if (res.status !== 1) {
        throw new Error(res?.msg);
      }
    }
  });

  // 导出全部
  const exportAll = useMutation({
    mutationFn: () => getAllRecord(colName),
  });

  // 导出全部
  const exportBatch = useMutation({
    mutationFn: (ids: string[]) => getBatchRecord(colName, JSON.stringify({ ids })),
  });

  // 检索测试
  const search = useMutation({
    mutationFn: ({ text, top_k, filters }: {
      text: string;
      top_k: number;
      filters: FilterCondition[]
    }) => searchRecord(colName, JSON.stringify({ text, top_k, filters })),
  });

  // 设定栏位
  const setField = useMutation({
    mutationFn: (list: FieldItem[]) => setFieldList(colName, JSON.stringify(list)),
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
