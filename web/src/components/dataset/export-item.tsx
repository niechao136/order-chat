'use client';

import { DownloadIcon, Loader2 } from 'lucide-react';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useRecordActions, useRecordField } from '@/hooks/use-dataset';
import { downloadExcelFile } from '@/utils/excel';
import { RecordInfo } from '@/types/dataset';


export function ExportAllButton({ collection }: {
  collection: string;
}) {
  const { data: fields, isLoading: fieldsLoading } = useRecordField(collection);
  const { exportAll } = useRecordActions(collection);
  const { mutate, isPending } = exportAll;

  const handleExport = useCallback(() => {
    if (!fields) {
      toast.error('字段配置未加载，请稍后重试');
      return;
    }

    mutate(undefined, {
      onSuccess: (res) => {

        const records = res.data;
        if (!records || records.length === 0) {
          toast.warning('当前集合暂无数据');
          return;
        }

        try {
          // 构建 Excel 数据
          const customFields = fields.filter(f => f.field_name !== 'updated_at');
          const headerRow = ['content', ...customFields.map(f => f.field_name)];

          const dataRows = records.map((record: RecordInfo) => {
            const payload = record.payload || {};
            return [
              payload.content || '',
              ...customFields.map(f => (payload[f.field_name] !== undefined ? String(payload[f.field_name]) : ''))
            ];
          });

          const sheetData = [headerRow, ...dataRows];
          downloadExcelFile(sheetData, `${collection}_全部数据.xlsx`, '数据集');

          toast.success(`成功导出 ${records.length} 条记录`);
        } catch (error) {
          console.error('导出失败:', error);
          toast.error('生成 Excel 文件失败');
        }
      },
      onError: (error) => {
        toast.error(`导出失败: ${error.message}`);
      },
    });
  }, [fields, mutate, collection]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleExport}
      disabled={fieldsLoading || isPending}
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <DownloadIcon className="mr-2 h-4 w-4" />
      )}
      导出全部
    </Button>
  );
}
