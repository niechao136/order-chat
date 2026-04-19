'use client';

import { DownloadIcon } from 'lucide-react';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useRecordField } from '@/hooks/use-dataset';
import { FieldItem } from '@/types/dataset';
import { downloadExcelFile } from '@/utils/excel';

interface DownloadTemplateProps {
  collection: string;
}

// 根据字段类型生成示例值
function getExampleValue(field: FieldItem): string {
  if (field.default_value !== undefined && field.default_value !== null) {
    return String(field.default_value);
  }
  switch (field.field_type) {
    case 'string':
      return '示例文本';
    case 'number':
      return '123';
    case 'boolean':
      return 'true';
    case 'array':
      return '["项目1","项目2"]';
    case 'object':
      return '{"key":"value"}';
    default:
      return '';
  }
}

// 生成表头行数据
function buildHeaderRow(fields: FieldItem[]): string[] {
  return ['content', ...fields.map(f => f.field_name)];
}

// 生成示例行数据
function buildExampleRow(fields: FieldItem[]): string[] {
  const contentExample = '这是向量的文本内容';
  const fieldExamples = fields.map(f => getExampleValue(f));
  return [contentExample, ...fieldExamples];
}

export function DownloadTemplate({ collection }: DownloadTemplateProps) {
  const { data: fields, isLoading } = useRecordField(collection);

  const handleDownload = useCallback(() => {
    if (!fields) {
      toast.error('字段配置未加载，请稍后重试');
      return;
    }

    // 过滤出自定义字段（排除 updated_at）
    const customFields = fields.filter(f => f.field_name !== 'updated_at');

    try {
      // 构建工作表数据：表头、描述行、示例行
      const headerRow = buildHeaderRow(customFields);
      const exampleRow = buildExampleRow(customFields);

      const sheetData = [headerRow, exampleRow];

      downloadExcelFile(sheetData, `${collection}_上传模板.xlsx`, '上传模板')

      toast.success('模板下载成功');
    } catch (error) {
      console.error('生成模板失败:', error);
      toast.error('生成模板失败，请重试');
    }
  }, [fields, collection]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDownload}
      disabled={isLoading}
    >
      <DownloadIcon className="mr-2 h-4 w-4" />
      下载模板
    </Button>
  );
}
