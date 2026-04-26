'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon, KeyIcon, Loader2Icon, PlusIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldLabel, FieldGroup, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { useApiKeyAction } from '@/hooks/use-api-key';
import { copyToClipboard } from '@/utils/string';


// 定义表单校验逻辑
const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: '密钥名称至少 2 个字符' })
    .max(50, { message: '密钥名称最多 50 个字符' }),
  description: z
    .string()
    .optional(),
  expires_at: z
    .string()
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;


export function AddApiKey() {

  const { add, jumpToFirst } = useApiKeyAction();

  const [ open, setOpen ] = useState(false);
  const [ createdKey, setCreatedKey ] = useState<{ key: string; name: string } | null>(null);
  const [ showKey, setShowKey ] = useState(false);
  const [ copied, setCopied ] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '', expires_at: '' },
  });

  const onSubmit = async (values: FormValues) => {
    const req = {
      name: values.name,
      permissions: [],
      rate_limit: 0,
      description: values.description,
      expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : undefined
    }
    // 调用 Mutation
    add.mutate(JSON.stringify(req), {
      onSuccess: async (res) => {
        await jumpToFirst();
        setCreatedKey({
          key: res?.data?.key ?? '',
          name: res?.data?.name ?? ''
        });
        toast.success(`密钥创建成功`);
        setOpen(false);
      },
      onError: (err: Error) => {
        toast.error(err.message || '密钥创建失败');
      },
    });
  };

  const handleCopy = async (content: string) => {
    if (!content) return;
    const res = await copyToClipboard(content);
    if (res) {
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('复制失败，请手动复制');
    }
  };

  const setWithReset = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) reset();
  };

  const closeAlert = () => {
    setCreatedKey(null);
    reset();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setWithReset}>
        <DialogTrigger asChild>
          <Button>
            <PlusIcon className="mr-2 h-4 w-4"/>
            创建密钥
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>创建新 API 密钥</DialogTitle>
            <DialogDescription>
              密钥仅创建时显示一次，请立即复制保存。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">
                  名称 <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  {...register('name')}
                  id="name"
                  placeholder="例如：生产环境密钥"
                  autoComplete="off"
                />
                {errors.name && <FieldError errors={[ errors.name ]}/>}
              </Field>
              <Field data-invalid={!!errors.expires_at}>
                <FieldLabel htmlFor="expires_at">
                  过期时间（可选）
                </FieldLabel>
                <Input
                  {...register('expires_at')}
                  id="expires_at"
                  type="datetime-local"
                  className="block w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  留空表示永不过期
                </p>
                {errors.expires_at && <FieldError errors={[ errors.expires_at ]}/>}
              </Field>
              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor="description">
                  描述
                </FieldLabel>
                <Textarea
                  {...register('description')}
                  id="description"
                  placeholder="可选描述信息"
                  rows={3}
                />
                {errors.description && <FieldError errors={[ errors.description ]}/>}
              </Field>
            </FieldGroup>
            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setWithReset(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={add.isPending}>
                {add.isPending && (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin"/>
                )}
                立即创建
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 显示刚创建的密钥明文 */}
      {createdKey && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-top-2">
          <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <KeyIcon className="h-4 w-4 shrink-0"/>
            <AlertDescription className="w-full min-w-0">
              <div className="flex flex-col gap-2">
                {/* 标题行：名称 + 提示 */}
                <div className="text-sm">
                  <strong>{createdKey.name}</strong> 的密钥（仅显示一次）：
                </div>

                {/* 密钥内容行：允许换行 + 按钮组 */}
                <div className="flex items-start gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono break-all">
                    {showKey ? createdKey.key : '•'.repeat(40)}
                  </code>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOffIcon className="h-4 w-4"/> : <EyeIcon className="h-4 w-4"/>}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopy(createdKey.key)}
                    >
                      {copied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <CopyIcon className="h-4 w-4"/>}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={closeAlert}
                    >
                      <XIcon className="mr-1 h-4 w-4"/>
                      关闭
                    </Button>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
}
