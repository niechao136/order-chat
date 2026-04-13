'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusIcon, Loader2Icon } from 'lucide-react';
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from '@/components/ui/label';
import { useRecordActions } from '@/hooks/use-dataset';
import { cn } from '@/lib/utils';
import { usePagingStore } from '@/stores/paging';


// 定义表单校验逻辑
const formSchema = z.object({
  text: z
    .string()
    .min(1, '内容不能为空'),
});

type FormValues = z.infer<typeof formSchema>;


export function AddItemDialog({ collection }: {
  collection: string
}) {

  const pagingKey = `dataset_${collection}`;

  const { setPage } = usePagingStore();

  const { add } = useRecordActions(collection);

  const [ open, setOpen ] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { text: '' },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = async (data: FormValues) => {
    // 调用 Mutation
    add.mutate(JSON.stringify(data), {
      onSuccess: () => {
        setPage(pagingKey, 1);
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>创建新向量</DialogTitle>
          <DialogDescription>
            请在下方的文本框中输入向量数据的内容。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="text">向量内容</Label>
            <Textarea
              id="text"
              placeholder="请输入"
              {...register('text')}
              className={cn(
                'min-h-[300px] leading-relaxed',
                errors.text && 'border-destructive'
              )}
              autoComplete="off"
            />
            {errors.text && (
              <p className="text-xs text-destructive font-medium">
                {errors.text.message}
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
