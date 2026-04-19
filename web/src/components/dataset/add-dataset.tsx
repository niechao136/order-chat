'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusIcon, Loader2Icon, DatabaseIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useColAction } from '@/hooks/use-dataset';

// 定义表单校验逻辑
const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '名称不能为空')
    .max(50, '名称过长')
    .regex(/^[a-zA-Z0-9_-]+$/, '仅支持字母、数字、下划线和连字符'),
});

type FormValues = z.infer<typeof formSchema>;

export function AddDatasetDialog() {

  const { add, refresh } = useColAction();

  const [ open, setOpen ] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = async (data: FormValues) => {
    // 调用 Mutation
    add.mutate(JSON.stringify(data), {
      onSuccess: async () => {
        await refresh(data.name);
        toast.success(`知识库 ${data.name} 创建成功`);
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
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" /> 新增知识库
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DatabaseIcon className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle>创建新知识库</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            知识库是存储向量数据的集合。创建后，您可以开始上传文档并进行向量化。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">知识库名称</Label>
            <Input
              id="name"
              placeholder="例如: customer_service_docs"
              {...register('name')}
              className={errors.name ? 'border-destructive' : ''}
              autoComplete="off"
            />
            {errors.name && (
              <p className="text-xs text-destructive font-medium">
                {errors.name.message}
              </p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              立即创建
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
