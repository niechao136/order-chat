'use client';

import { EraserIcon } from 'lucide-react';
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
import { usePagingStore } from '@/stores/paging';


export function ClearDatasetDialog({ collection }: {
  collection: string
}) {

  const pagingKey = `dataset_${collection}`;

  const { setPage } = usePagingStore();

  const { clear } = useRecordActions(collection);

  const clearDataset = () => {
    clear.mutate(undefined, {
      onSuccess: () => {
        setPage(pagingKey, 1);
        toast.success(`知识库 ${collection} 清空成功`);
      },
      onError: (err: Error) => {
        toast.error(err.message || '清空失败');
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
          <EraserIcon className="mr-2 h-4 w-4"/> 清空知识库
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确定要清空知识库吗？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作将永久删除知识库 <span
            className="font-bold text-foreground">{collection}</span> 包含的所有向量数据，不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={() => clearDataset()}
            disabled={clear.isPending}
          >
            {clear.isPending ? '清空中...' : '确认清空'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
