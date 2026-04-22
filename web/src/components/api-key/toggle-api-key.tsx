'use client';

import { PowerIcon, PowerOffIcon } from 'lucide-react';
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

interface ToggleApiKeyProps {
  info: ApiKeyInfo;
  disabled?: boolean;
}

export function ToggleApiKey({ info, disabled }: ToggleApiKeyProps) {
  const { toggle, refresh } = useApiKeyAction();
  const [open, setOpen] = useState(false);
  const isActive = info.is_active;

  const handleToggle = () => {
    toggle.mutate(
      { key_id: info.id, is_active: !isActive },
      {
        onSuccess: async () => {
          await refresh();
          toast.success(`密钥已${!isActive ? '启用' : '停用'}`);
          setOpen(false);
        },
        onError: (err: Error) => {
          toast.error(err.message || '操作失败');
        },
      }
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          disabled={disabled}
          variant="ghost"
          size="sm"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          title={isActive ? '停用密钥' : '启用密钥'}
        >
          {isActive ? (
            <PowerOffIcon className="h-4 w-4" />
          ) : (
            <PowerIcon className="h-4 w-4" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            确定要{isActive ? '停用' : '启用'}密钥吗？
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isActive
              ? '停用后，该密钥将无法用于 API 认证，但可随时重新启用。'
              : '启用后，该密钥将恢复 API 认证功能。'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            className={
              isActive
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-primary hover:bg-primary/90'
            }
            onClick={handleToggle}
            disabled={toggle.isPending}
          >
            {toggle.isPending
              ? '处理中...'
              : isActive
              ? '确认停用'
              : '确认启用'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
