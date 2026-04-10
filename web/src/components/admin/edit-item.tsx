'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Edit3Icon, Loader2Icon } from 'lucide-react';
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
import { RequiredPageParams } from '@/types/api';
import { RecordInfo } from '@/types/dataset';


// 定义表单校验逻辑
const formSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, '内容不能为空'),
});

type FormValues = z.infer<typeof formSchema>;


export function EditItemDialog({ collection, item, params }: {
  collection: string
  item: RecordInfo
  params: RequiredPageParams
}) {

  const { update } = useRecordActions(collection, params);

  const [ open, setOpen ] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { text: item.payload.content },
  });

  const onSubmit = async (data: FormValues) => {
    // 调用 Mutation
    const { id } = item;
    const body = JSON.stringify(data);
    update.mutate({ id, body }, {
      onSuccess: () => {
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
            修改内容会触发后台重新向量化，可能会消耗一定的计算资源。
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
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              保存修改
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
