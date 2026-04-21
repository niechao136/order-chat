'use client';

import { DatabaseIcon, DownloadIcon, Loader2 } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
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

import { AddItemDialog } from '@/components/dataset/add-item';
import { BatchDeleteItem } from '@/components/dataset/batch-delete-item';
import { ClearDatasetDialog } from '@/components/dataset/clear-dataset';
import { DeleteItemDialog } from '@/components/dataset/delete-item';
import { DownloadTemplate } from '@/components/dataset/download-template';
import { EditItemDialog } from '@/components/dataset/edit-item';
import { ExportAllButton } from '@/components/dataset/export-item';
import { ManageFieldsDialog } from '@/components/dataset/manage-field';
import { UploadItem } from '@/components/dataset/upload-item';
import { ViewItemDialog } from '@/components/dataset/view-item';
import { TablePaging } from '@/components/base/pagination';

import { useRecordList, useRecordField, useRecordActions } from '@/hooks/use-dataset';
import { usePagingStore } from '@/stores/paging';
import { downloadExcelFile } from '@/utils/excel';
import { RecordInfo } from '@/types/dataset';
import { formatTime } from '@/utils/time';


function formatFieldValue(value: unknown, fieldType: string): string {
  if (value === undefined || value === null) return '-';
  switch (fieldType) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'array':
    case 'object':
      return JSON.stringify(value);
    default:
      return String(value);
  }
}

export const getColumnWidthClass = (fieldType: string): string => {
  switch (fieldType) {
    case 'string': return 'w-64';
    case 'number': return 'w-24';
    case 'boolean': return 'w-20';
    case 'array':
    case 'object': return 'w-40';
    default: return 'w-40';
  }
};


export function DatasetTable({ collection }: {
  collection: string
}) {

  const pagingKey = `dataset_${collection}`;
  const { page, size } = usePagingStore((state) => state.getPaging(pagingKey));
  const { setSize, setPage, initPaging } = usePagingStore();

  useEffect(() => {
    initPaging(pagingKey);
  }, [initPaging, pagingKey]);

  const params = useMemo(() => ({
    page,
    size,
  }), [page, size]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading } = useRecordList(collection, params);
  const { exportBatch } = useRecordActions(collection);
  const { data: fields, isLoading: fieldsLoading } = useRecordField(collection);

  // 过滤出需要在表格中显示的自定义字段（排除 content 和 updated_at）
  const displayFields = useMemo(() => {
    if (!fields) return [];
    return fields.filter(
      (f) => !['content', 'updated_at'].includes(f.field_name)
    );
  }, [fields]);

  const batchExport = () => {
    exportBatch.mutate(selectedIds, {
      onSuccess: async (res) => {
        const records = res.data;
        try {
          // 构建 Excel 数据
          const customFields = fields?.filter(f => f.field_name !== 'updated_at') ?? [];
          const headerRow = ['content', ...customFields.map(f => f.field_name)];

          const dataRows = records.map((record: RecordInfo) => {
            const payload = record.payload || {};
            return [
              payload.content || '',
              ...customFields.map(f => (payload[f.field_name] !== undefined ? String(payload[f.field_name]) : ''))
            ];
          });

          const sheetData = [headerRow, ...dataRows];
          downloadExcelFile(sheetData, `${collection}_选中数据.xlsx`, '数据集');

          toast.success(`成功导出 ${records.length} 条记录`);
        } catch (error) {
          console.error('导出失败:', error);
          toast.error('生成 Excel 文件失败');
        }
      },
      onError: (err: Error) => {
        toast.error(err.message || '批量导出失败');
      },
    })
  };

  return (
    <>
      <Card className="flex-1 flex flex-col shadow-sm overflow-hidden">
        <CardHeader className="py-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">数据列表</CardTitle>
            <CardDescription>管理当前知识库中的 {data?.total || 0} 条向量数据</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <ManageFieldsDialog collection={collection} disabled={(data?.total || 0) > 0} />
            <AddItemDialog collection={collection} />
            <UploadItem collection={collection} />
            <DownloadTemplate collection={collection} />
            <ExportAllButton collection={collection} />
            <ClearDatasetDialog collection={collection} />
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 pt-0">
          <div className="rounded-md border flex-1 overflow-auto relative">
            <Table className="table-fixed w-full">
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={selectedIds.length > 0 && selectedIds.length === data?.data.length}
                      onCheckedChange={() => setSelectedIds(selectedIds.length === data?.data.length ? [] : data?.data.map(r => r.id) ?? [])}
                    />
                  </TableHead>
                  <TableHead>向量内容</TableHead>
                  {/* 动态自定义字段列 */}
                  {displayFields.map((field) => (
                    <TableHead key={field.field_name} className={getColumnWidthClass(field.field_type)}>
                      {field?.description ?? field.field_name}
                    </TableHead>
                  ))}
                  <TableHead className="w-35">更新时间</TableHead>
                  <TableHead className="w-35 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading || fieldsLoading ? (
                  <TableRow><TableCell colSpan={4 + displayFields.length} className="h-64 text-center">加载中...</TableCell></TableRow>
                ) : data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4 + displayFields.length} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 opacity-50">
                        <DatabaseIcon className="h-8 w-8"/>
                        <p>暂无数据，请先新增向量</p>
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
                      {displayFields.map((field) => {
                        const value = record.payload?.[field.field_name];
                        return (
                          <TableCell key={field.field_name} className={getColumnWidthClass(field.field_type)}>
                            <span className="text-sm text-muted-foreground">
                              {formatFieldValue(value, field.field_type)}
                            </span>
                          </TableCell>
                        );
                      })}
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
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-white/30 text-white bg-transparent hover:bg-white/10 hover:border-white/50 hover:text-white"
            disabled={exportBatch.isPending}
            onClick={() => batchExport()}
          >
            {exportBatch.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
            ) : (
              <DownloadIcon className="mr-2 h-4 w-4"/>
            )}
            批量导出
          </Button>
          <BatchDeleteItem collection={collection} ids={selectedIds} callback={() => setSelectedIds([])}/>
        </div>
      )}
    </>
  );

}
