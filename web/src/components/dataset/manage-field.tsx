'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2Icon, PlusIcon, Settings2Icon, Trash2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';


import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Field, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import { usePointActions, usePointField } from '@/hooks/use-dataset';
import { FieldItem } from '@/types/dataset';
import { PRESET_FIELDS, isPresetField } from '@/utils/dataset';


// ---------- Zod 校验规则 ----------
const fieldSchema = z.object({
  field_name: z
    .string()
    .trim()
    .min(1, '字段名不能为空')
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, '只能包含字母、数字和下划线，且不能以数字开头'),
  field_type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  is_required: z.boolean(),
  default_value: z.any().optional(),
  description: z.string().optional()
});

const formSchema = z.object({
  fields: z.array(fieldSchema).min(1, '至少需要定义一个字段')
});

type FieldValues = z.infer<typeof fieldSchema>;
type FormValues = z.infer<typeof formSchema>;


// ---------- 主组件 ----------
export function ManageFieldsDialog({ dataset, disabled }: {
  dataset: string
  disabled: boolean
}) {

  const [ open, setOpen ] = useState(false);

  // 获取当前字段列表
  const { data: fields, isLoading } = usePointField(dataset);
  const { setField, refreshField } = usePointActions(dataset);

  // 表单实例
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fields: []
    }
  });

  const { fields: fieldArray, append, remove } = useFieldArray({
    control: control,
    name: 'fields'
  });

  // 当数据加载完成或对话框打开时，回填表单
  useEffect(() => {
    if (open && fields) {
      const customFields = fields.filter(f => !isPresetField(f.field_name));
      reset({
        fields: [...PRESET_FIELDS, ...customFields.map((f) => ({
          field_name: f.field_name,
          field_type: f.field_type,
          is_required: f.is_required,
          default_value: f.default_value,
          description: f.description || ''
        } as FieldValues))]
      });
    }
  }, [ open, fields, reset ]);

  const onSubmit = (data: FormValues) => {
    // 过滤掉临时 id 等不需要的字段，直接传递 FieldItem[]
    const customFields = data.fields.filter(f => !isPresetField(f.field_name));
    const payload: FieldItem[] = customFields.map((f) => ({
      field_name: f.field_name,
      field_type: f.field_type,
      is_required: f.is_required,
      default_value: f.default_value,
      description: f.description
    }));
    setField.mutate(payload, {
      onSuccess: async () => {
        await refreshField();
        toast.success('字段配置已更新');
        setOpen(false);
      },
      onError: (error: Error) => {
        toast.error(error.message || '更新失败');
      }
    });
  };

  // 关闭时重置
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      reset();
    }
  };

  const handleAddField = () => {
    append({
      field_name: '',
      field_type: 'string',
      is_required: false,
      default_value: '',
      description: '',
    });
  };

  const handleRemoveField = (index: number) => {
    const field = fieldArray[index];
    if (isPresetField(field.field_name)) {
      toast.error('系统预设字段不可删除');
      return;
    }
    remove(index);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2Icon className="mr-2 h-4 w-4"/>
          知识库字段
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>知识库字段配置</DialogTitle>
          <DialogDescription>
            定义该知识库中每条数据的字段结构。字段名需符合标识符规范且唯一。
            <br />
            <span className="text-amber-600 dark:text-amber-400">
              ⚠️ 仅当知识库为空时才能修改字段配置，否则可能导致数据不一致。
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2Icon className="mr-2 inline h-4 w-4 animate-spin"/>
              加载字段配置中...
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[200px]">字段名</TableHead>
                    <TableHead className="w-[120px]">类型</TableHead>
                    <TableHead className="w-[80px]">必填</TableHead>
                    <TableHead className="w-[180px]">默认值</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead className="w-[60px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fieldArray.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        暂无字段，请点击下方按钮添加
                      </TableCell>
                    </TableRow>
                  ) : (
                    fieldArray.map((field, index) => {
                      const preset = isPresetField(field.field_name);
                      return (
                        <TableRow key={field.id}>
                          {/* 字段名 */}
                          <TableCell>
                            <Field data-invalid={!!errors?.fields?.[index]?.field_name}>
                              <Input
                                {...register(`fields.${index}.field_name`)}
                                placeholder="请输入字段名"
                                disabled={disabled || preset}
                                autoComplete={'off'}
                              />
                              {!!errors?.fields?.[index]?.field_name &&
                                <FieldError errors={[ errors.fields[index].field_name ]}/>}
                            </Field>
                          </TableCell>

                          {/* 类型 */}
                          <TableCell>
                            <Field data-invalid={!!errors?.fields?.[index]?.field_type}>
                              <Controller
                                control={control}
                                name={`fields.${index}.field_type`}
                                render={({ field }) => (
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    disabled={disabled || preset}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="选择类型"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="string">字符串</SelectItem>
                                      <SelectItem value="number">数字</SelectItem>
                                      <SelectItem value="boolean">布尔值</SelectItem>
                                      <SelectItem value="array">数组</SelectItem>
                                      <SelectItem value="object">对象</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                              {!!errors?.fields?.[index]?.field_type &&
                                <FieldError errors={[ errors.fields[index].field_type ]}/>}
                            </Field>
                          </TableCell>

                          {/* 必填 */}
                          <TableCell>
                            <div className="flex">
                              <Controller
                                control={control}
                                name={`fields.${index}.is_required`}
                                render={({ field }) => (
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={disabled || preset}
                                  />
                                )}
                              />
                            </div>
                            {errors?.fields?.[index]?.is_required && (
                              <FieldError errors={[ errors.fields[index].is_required ]}/>
                            )}
                          </TableCell>

                          {/* 默认值 */}
                          <TableCell>
                            <Field data-invalid={!!errors?.fields?.[index]?.default_value}>
                              <Input
                                {...register(`fields.${index}.default_value`)}
                                placeholder="请输入默认值"
                                disabled={disabled || preset}
                                autoComplete={'off'}
                              />
                              {!!errors?.fields?.[index]?.default_value &&
                                <FieldError errors={[ errors.fields[index].default_value ]}/>}
                            </Field>
                          </TableCell>

                          {/* 描述 */}
                          <TableCell>
                            <Field data-invalid={!!errors?.fields?.[index]?.description}>
                              <Input
                                {...register(`fields.${index}.description`)}
                                placeholder="请输入描述"
                                disabled={disabled || preset}
                                autoComplete={'off'}
                              />
                              {!!errors?.fields?.[index]?.description &&
                                <FieldError errors={[ errors.fields[index].description ]}/>}
                            </Field>
                          </TableCell>

                          {/* 删除按钮 */}
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveField(index)}
                              disabled={disabled || preset}
                            >
                              <Trash2Icon className="h-4 w-4 text-destructive"/>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 添加字段按钮 */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={handleAddField}
          >
            <PlusIcon className="mr-2 h-4 w-4"/>
            添加字段
          </Button>

          {/* 全局错误提示 */}
          {errors.fields?.root?.message && (
            <p className="text-sm font-medium text-destructive">
              {errors.fields.root.message}
            </p>
          )}
          {errors.fields?.message && (
            <p className="text-sm font-medium text-destructive">
              {errors.fields.message}
            </p>
          )}

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={setField.isPending || disabled}>
              {setField.isPending && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin"/>
              )}
              保存配置
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
