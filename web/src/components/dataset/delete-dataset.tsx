'use client';

import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

import { useDatasetAction } from '@/hooks/use-dataset';


export function DeleteDatasetDialog({ name }: {
  name: string
}) {

  const { remove, refresh } = useDatasetAction();

  const [ open, setOpen ] = useState(false);

  const delDataset = (name: string) => {
    remove.mutate(name, {
      onSuccess: async () => {
        await refresh(name);
        toast.success(`知识库 ${name} 删除成功`);
        setOpen(false);
      },
      onError: (err: Error) => {
        toast.error(err.message || '删除失败');
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
          <Trash2Icon className="h-4 w-4"/>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确定要删除吗？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作将永久删除知识库 <span
            className="font-bold text-foreground">{name}</span> 及其包含的所有向量数据，不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={() => delDataset(name)}
            disabled={remove.isPending}
          >
            {remove.isPending ? '删除中...' : '确认删除'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
