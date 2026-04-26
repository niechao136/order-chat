'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Control, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusIcon, Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from "@/components/ui/textarea";

import { usePointField, usePointActions } from '@/hooks/use-dataset';
import { cn } from '@/lib/utils';
import { FieldItem, CommonZod } from '@/types/dataset';
import { PRESET_FIELD_NAME } from '@/utils/dataset';


// 根据字段类型生成对应的输入组件
export const renderFieldInput = (
  field: FieldItem,
  control: Control,
) => {
  const commonProps = {
    id: field.field_name,
    placeholder: field.description || `请输入${field.field_name}`,
    autoComplete: 'off',
  };

  switch (field.field_type) {
    case 'string':
      return <Controller
        name={field.field_name}
        control={control}
        render={({ field }) => (
          <Input
            {...commonProps}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />;
    case 'number':
      return <Controller
        name={field.field_name}
        control={control}
        render={({ field }) => (
          <Input
            {...commonProps}
            type="number"
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />;
    case 'boolean':
      return <Controller
        name={field.field_name}
        control={control}
        render={({ field }) => (
          <Checkbox
            {...commonProps}
            value={field.value}
            onCheckedChange={field.onChange}
          />
        )}
      />;
    case 'array':
      // 简单处理：期望用户输入 JSON 数组字符串，也可扩展为标签输入
      return <Controller
        name={field.field_name}
        control={control}
        render={({ field }) => (
          <Textarea
            {...commonProps}
            rows={2}
            value={field.value}
            onChange={field.onChange}
            placeholder={'例如: ["a", "b", "c"]'}
          />
        )}
      />;
    case 'object':
      // 简单处理：期望用户输入 JSON 对象字符串
      return <Controller
        name={field.field_name}
        control={control}
        render={({ field }) => (
          <Textarea
            {...commonProps}
            rows={2}
            value={field.value}
            onChange={field.onChange}
            placeholder={'例如: {"key": "value"}'}
          />
        )}
      />;
    default:
      return <Controller
        name={field.field_name}
        control={control}
        render={({ field }) => (
          <Input
            {...commonProps}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />;
  }
};


export function AddItemDialog({ dataset }: {
  dataset: string
}) {

  const { add, jumpToLast } = usePointActions(dataset);
  const { data: fields, isLoading: fieldsLoading } = usePointField(dataset);

  const [ open, setOpen ] = useState(false);

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

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: '',
      ...customFields.reduce((acc, field) => {
        if (field.default_value !== undefined && field.default_value !== null) {
          acc[field.field_name] = field.default_value;
        }
        return acc;
      }, {} as Record<string, unknown>),
    },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset, customFields]);

  const onSubmit = async (data: FormValues) => {
    const { content, ...metadataValues } = data;
    const payload = {
      content,
      metadata: metadataValues,
    };
    // 调用 Mutation
    add.mutate(JSON.stringify(payload), {
      onSuccess: async () => {
        await jumpToLast();
        toast.success(`向量创建成功`);
        setOpen(false);
      },
      onError: (err: Error) => {
        toast.error(err.message || '创建失败');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon className="mr-2 h-4 w-4"/> 新增向量
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>创建新向量</DialogTitle>
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
                  'min-h-37.5 leading-relaxed',
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
              <Button type="submit" disabled={add.isPending}>
                {add.isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                立即创建
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
