'use client';

import { DatabaseIcon, Trash2Icon } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { AddItemDialog } from '@/components/admin/add-item';
import { ClearDatasetDialog } from '@/components/admin/clear-dataset';
import { DeleteItemDialog } from '@/components/admin/delete-item';
import { EditItemDialog } from '@/components/admin/edit-item';
import { UploadItem } from '@/components/admin/upload-item';
import { ViewItemDialog } from '@/components/admin/view-item';
import { TablePaging } from '@/components/base/pagination';

import { useRecordList, useRecordActions } from '@/hooks/use-dataset';
import { usePagingStore } from '@/stores/paging';
import { formatTime } from '@/utils/time';


export function DatasetTable({ collection }: {
  collection: string
}) {

  const pagingKey = `dataset_${collection}`;
  const { page, size } = usePagingStore((state) => state.getPaging(pagingKey));
  const { setSize, setPage } = usePagingStore();

  const params = useMemo(() => ({
    page,
    size,
  }), [page, size])

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading } = useRecordList(collection, params);
  const { remove } = useRecordActions(collection);

  const batchDel = () => {
    remove.mutate(selectedIds, {
      onSuccess: async () => {
        toast.success(`批量删除成功`);
        setSelectedIds([]);
      },
      onError: (err: Error) => {
        toast.error(err.message || '批量删除失败');
      },
    })
  }

  return (
    <>
      <Card className="flex-1 flex flex-col shadow-sm overflow-hidden">
        <CardHeader className="py-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">数据列表</CardTitle>
            <CardDescription>管理当前知识库中的 {data?.total || 0} 条向量数据</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <AddItemDialog collection={collection} />
            <UploadItem collection={collection} />
            <ClearDatasetDialog collection={collection} />
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 pt-0">
          <div className="rounded-md border flex-1 overflow-auto relative">
            <Table className="table-fixed w-full">
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[48px] text-center">
                    <Checkbox
                      checked={selectedIds.length > 0 && selectedIds.length === data?.data.length}
                      onCheckedChange={() => setSelectedIds(selectedIds.length === data?.data.length ? [] : data?.data.map(r => r.id) ?? [])}
                    />
                  </TableHead>
                  <TableHead>内容预览</TableHead>
                  <TableHead className="w-[140px]">更新时间</TableHead>
                  <TableHead className="w-[140px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="h-64 text-center">加载中...</TableCell></TableRow>
                ) : data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 opacity-50">
                        <DatabaseIcon className="h-8 w-8"/>
                        <p>暂无数据，请先上传文件</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data.map((record) => (
                    <TableRow key={record.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center">
                        <Checkbox
                          checked={selectedIds.includes(record.id)}
                          onCheckedChange={() => setSelectedIds(prev => prev.includes(record.id) ? prev.filter(i => i !== record.id) : [ ...prev, record.id ])}
                        />
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="w-full">
                          <p className="text-sm leading-relaxed text-foreground line-clamp-2 break-all">
                            {record.payload.content}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">{formatTime(record.payload.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* 1. 查看详情 */}
                          <ViewItemDialog content={record.payload.content}/>

                          {/* 2. 修改向量 */}
                          <EditItemDialog collection={collection} item={record} />

                          {/* 3. 删除向量 */}
                          <DeleteItemDialog collection={collection} item={record} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <TablePaging
            total={data?.total ?? 0}
            page={page}
            setPage={(page) => setPage(pagingKey, page)}
            size={size}
            setSize={(size) => setSize(pagingKey, size)}
          />
        </CardContent>
      </Card>
      {/* 批量操作（仅在选中时浮现） */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl z-50 animate-in fade-in zoom-in">
          <span className="text-sm font-medium">已选中 {selectedIds.length} 条向量</span>
          <div className="w-px h-4 bg-slate-700" />
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-slate-800"
            onClick={() => setSelectedIds([])}>
            取消
          </Button>
          <Button size="sm" variant="destructive" className="h-8" onClick={() => batchDel()}>
            <Trash2Icon className="mr-2 h-3.5 w-3.5" /> 批量删除
          </Button>
        </div>
      )}
    </>
  )

}
