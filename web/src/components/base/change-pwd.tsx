'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel, FieldGroup, FieldError } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserAction } from '@/hooks/use-user';
import { handleLogout } from '@/services/api';


const formSchema = z.object({
  password: z
    .string()
    .min(6, { message: '密码至少 6 个字符' })
    .regex(/[a-zA-Z]/, { message: '密码需包含至少一个字母' })
    .regex(/[0-9]/, { message: '密码需包含至少一个数字' }),
  reply_pwd: z
    .string()
    .min(6, { message: '密码至少 6 个字符' }),
}).refine((data) => data.password === data.reply_pwd, {
  message: "两次输入的密码不一致",
  path: ["reply_pwd"], // 错误信息会绑定在 reply_pwd 字段上
});

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePassword({ open, onOpenChange }: ChangePasswordDialogProps) {

  const { changeMe } = useUserAction()
  const { isPending, mutate } = changeMe

  const { handleSubmit, register, reset, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: '', reply_pwd: '' }
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = async ({ password }: z.infer<typeof formSchema>) => {
    mutate({ password }, {
      onSuccess: () => {
        toast.success('密码修改成功，请重新登录');
        onOpenChange(false);
        handleLogout();
      },
      onError: (err) => {
        toast.error(err.message || "修改失败");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <KeyRound className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle>修改密码</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            请输入您的新密码。修改成功后，将会强制登出，之后请使用新密码重新登录。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <FieldGroup>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">新密码</FieldLabel>
              <Input
                {...register('password')}
                id="password"
                type="password"
                placeholder="请输入密码"
              />
              {errors.password && <FieldError errors={[ errors.password ]}/>}
            </Field>
            <Field data-invalid={!!errors.reply_pwd}>
              <FieldLabel htmlFor="reply_pwd">重复密码</FieldLabel>
              <Input
                {...register('reply_pwd')}
                id="reply_pwd"
                type="password"
                placeholder="请再次输入密码"
              />
              {errors.reply_pwd && <FieldError errors={[ errors.reply_pwd ]}/>}
            </Field>
          </FieldGroup>

          <DialogFooter className="pt-4">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认修改
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
