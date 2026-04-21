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

import { useRecordActions } from '@/hooks/use-dataset';


interface BatchDeleteItemProp {
  collection: string
  ids: string[]
  callback: () => void
}


export function BatchDeleteItem({ collection, ids, callback }: BatchDeleteItemProp) {

  const { remove, checkPage } = useRecordActions(collection);

  const [ open, setOpen ] = useState(false);

  const delItem = () => {
    remove.mutate(ids, {
      onSuccess: async () => {
        await checkPage();
        toast.success(`批量删除成功`);
        setOpen(false);
        callback();
      },
      onError: (err: Error) => {
        toast.error(err.message || '批量删除失败');
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="destructive" className="h-8">
          <Trash2Icon className="mr-2 h-3.5 w-3.5"/> 批量删除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确定要批量删除选中的向量数据吗？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作将永久删除选中的向量数据，不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={() => delItem()}
            disabled={remove.isPending}
          >
            {remove.isPending ? '删除中...' : '确认删除'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
