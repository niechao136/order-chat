'use client';

import { UploadIcon, Loader2Icon } from 'lucide-react';
import { useState, useRef, ChangeEvent } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useRecordField, useRecordActions } from '@/hooks/use-dataset';
import { FieldItem } from '@/types/dataset';
import { readExcelFile } from '@/utils/excel';


// 从 Excel 数据中解析并构建 ItemAdd 对象
function parseExcelData(
  jsonData: Record<string, unknown>[],
  fields: FieldItem[]
): { content: string; metadata: Record<string, unknown> }[] {
  const result: { content: string; metadata: Record<string, unknown> }[] = [];

  for (const row of jsonData) {
    // 获取 content 列的值（必须存在）
    const content = row['content'];
    if (content === undefined || content === null || String(content).trim() === '') {
      throw new Error('Excel 中必须包含 "content" 列且内容不能为空');
    }

    const metadata: Record<string, unknown> = {};
    // 遍历自定义字段，从 Excel 中取值
    for (const field of fields) {
      const fieldName = field.field_name;
      // 跳过预设字段
      if (fieldName === 'content' || fieldName === 'updated_at') continue;

      const rawValue = row[fieldName];

      // 处理必填校验
      if (field.is_required && (rawValue === undefined || rawValue === null || rawValue === '')) {
        throw new Error(`字段 "${fieldName}" 是必填项，但第 ${result.length + 1} 行数据缺失`);
      }

      // 根据类型转换值
      let parsedValue: unknown = rawValue;
      if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
        switch (field.field_type) {
          case 'number':
            const num = Number(rawValue);
            if (isNaN(num)) {
              throw new Error(`字段 "${fieldName}" 应为数字，但值为 "${rawValue}"`);
            }
            parsedValue = num;
            break;
          case 'boolean':
            parsedValue = String(rawValue).toLowerCase() === 'true' || rawValue === 1;
            break;
          case 'array':
          case 'object':
            try {
              parsedValue = JSON.parse(String(rawValue));
            } catch {
              throw new Error(`字段 "${fieldName}" 应为有效的 JSON 格式`);
            }
            break;
          default:
            parsedValue = String(rawValue);
        }
        metadata[fieldName] = parsedValue;
      } else if (field.default_value !== undefined && field.default_value !== null) {
        // 使用默认值
        metadata[fieldName] = field.default_value;
      }
    }

    result.push({
      content: String(content),
      metadata,
    });
  }

  return result;
}


export function UploadItem({ collection }: {
  collection: string
}) {

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);

  const { upload, jumpToLast } = useRecordActions(collection);
  const { data: fields, isLoading: fieldsLoading } = useRecordField(collection);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const data = await readExcelFile(file);

      if (!fields) {
        toast.error('字段配置未加载，请稍后重试');
        return;
      }

      const items = parseExcelData(data, fields);

      if (items.length === 0) {
        toast.error('Excel 文件中没有有效数据');
        return;
      }

      upload.mutate(JSON.stringify(items), {
        onSuccess: async () => {
          await jumpToLast();
          toast.success(`成功上传 ${items.length} 条数据`);
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
        onError: (error: Error) => {
          toast.error(error.message || '上传失败');
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '解析文件失败');
    } finally {
      setIsParsing(false);
    }
  };

  const isLoading = isParsing || upload.isPending || fieldsLoading;

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".xlsx, .xls, .csv"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
      >
        {isLoading ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin"/> : <UploadIcon className="mr-2 h-4 w-4"/>}
        批量上传
      </Button>
    </>
  )
}
