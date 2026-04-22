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

import { useApiKeyAction } from '@/hooks/use-api-key';
import { ApiKeyInfo } from '@/types/api-key';


export function DeleteApiKey({ info, disabled }: {
  info: ApiKeyInfo
  disabled: boolean
}) {

  const { remove, checkPage } = useApiKeyAction();

  const [ open, setOpen ] = useState(false);

  const delItem = () => {
    remove.mutate([info.id], {
      onSuccess: async () => {
        await checkPage();
        toast.success(`删除成功`);
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
        <Button disabled={disabled} variant="ghost" size="sm"
                className="h-8 w-8 text-muted-foreground hover:text-destructive">
          <Trash2Icon className="h-4 w-4"/>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确定要删除密钥吗？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作将永久删除该密钥，不可撤销。
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
