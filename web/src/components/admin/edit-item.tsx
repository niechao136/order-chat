'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Edit3Icon, Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from "@/components/ui/textarea";

import { renderFieldInput } from '@/components/admin/add-item';

import { useRecordField, useRecordActions } from '@/hooks/use-dataset';
import { cn } from '@/lib/utils';
import { RecordInfo, CommonZod } from '@/types/dataset';
import { PRESET_FIELD_NAME } from '@/utils/dataset';


export function EditItemDialog({ collection, item }: {
  collection: string
  item: RecordInfo
}) {

  const { update, jumpToLast } = useRecordActions(collection);
  const { data: fields, isLoading: fieldsLoading } = useRecordField(collection);

  // 过滤出自定义字段（排除预设字段）
  const customFields = useMemo(() => {
    if (!fields) return [];
    return fields.filter((f) => !PRESET_FIELD_NAME.includes(f.field_name));
  }, [fields]);

  // 动态构建 Zod schema
  const formSchema = useMemo(() => {
    const shape: Record<string, CommonZod> = {
      content: z.string().trim().min(1, '内容不能为空'),
    };

    customFields.forEach((field) => {
      let validator: CommonZod;
      switch (field.field_type) {
        case 'string':
          validator = z.string();
          break;
        case 'number':
          validator = z.number();
          break;
        case 'boolean':
          validator = z.boolean();
          break;
        case 'array':
          // 简单校验 JSON 数组格式
          validator = z
            .string()
            .refine(
              (val) => {
                try {
                  const parsed = JSON.parse(val);
                  return Array.isArray(parsed);
                } catch {
                  return false;
                }
              },
              { message: '必须是有效的 JSON 数组' }
            )
            .transform((val) => JSON.parse(val));
          break;
        case 'object':
          // 简单校验 JSON 对象格式
          validator = z
            .string()
            .refine(
              (val) => {
                try {
                  const parsed = JSON.parse(val);
                  return typeof parsed === 'object' && !Array.isArray(parsed);
                } catch {
                  return false;
                }
              },
              { message: '必须是有效的 JSON 对象' }
            )
            .transform((val) => JSON.parse(val));
          break;
        default:
          validator = z.any();
      }

      // 处理可选/必填
      if (!field.is_required) {
        validator = validator.optional();
      }

      shape[field.field_name] = validator;
    });

    return z.object(shape);
  }, [customFields]);

  type FormValues = z.infer<typeof formSchema>;

  const [ open, setOpen ] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: item.payload.content,
      ...customFields.reduce((acc, field) => {
        acc[field.field_name] = item.payload?.[field.field_name];
        return acc;
      }, {} as Record<string, unknown>),
    },
  });

  const onSubmit = async (data: FormValues) => {
    // 调用 Mutation
    const { id } = item;
    const { content, ...metadataValues } = data;
    const payload = {
      content,
      metadata: metadataValues,
    };
    const body = JSON.stringify(payload);
    update.mutate({ id, body }, {
      onSuccess: async () => {
        await jumpToLast();
        toast.success(`向量修改成功`);
        setOpen(false);
      },
      onError: (err: Error) => {
        toast.error(err.message || '修改失败');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary">
          <Edit3Icon className="h-4 w-4"/>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>编辑向量内容</DialogTitle>
          <DialogDescription>
            填写向量内容及自定义字段信息。
          </DialogDescription>
        </DialogHeader>

        {fieldsLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            <Loader2Icon className="mr-2 inline h-4 w-4 animate-spin" />
            加载字段配置中...
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* 固定内容字段 */}
            <div className="grid gap-2">
              <Label htmlFor="content">
                向量内容 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="content"
                placeholder="请输入"
                {...register('content')}
                className={cn(
                  'min-h-[150px] leading-relaxed',
                  errors.content && 'border-destructive'
                )}
                autoComplete="off"
              />
              {errors.content && (
                <p className="text-xs text-destructive font-medium">
                  {errors.content.message?.toString()}
                </p>
              )}
            </div>

            {/* 动态自定义字段 */}
            {customFields.map((field) => (
              <div key={field.field_name} className="grid gap-2">
                <Label htmlFor={field.field_name}>
                  {field?.description ?? field.field_name}
                  {field.is_required && (
                    <span className="text-destructive ml-0.5">*</span>
                  )}
                </Label>
                {renderFieldInput(
                  field,
                  control,
                )}
                {errors[field.field_name] && (
                  <p className="text-xs text-destructive font-medium">
                    {errors[field.field_name]?.message?.toString()}
                  </p>
                )}
              </div>
            ))}

            <DialogFooter className="pt-4">
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                保存修改
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
