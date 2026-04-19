'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { RotateCcwKeyIcon, Loader2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

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

import { useUserAction } from '@/hooks/use-user';
import { UserInfo } from '@/types/user';


const formSchema = z.object({
  password: z
    .string()
    .trim()
    .min(6, { message: '密码至少 6 个字符' })
    .regex(/[a-zA-Z]/, { message: '密码需包含至少一个字母' })
    .regex(/[0-9]/, { message: '密码需包含至少一个数字' }),
  reply_pwd: z
    .string()
    .trim()
    .min(6, { message: '密码至少 6 个字符' }),
}).refine((data) => data.password === data.reply_pwd, {
  message: "两次输入的密码不一致",
  path: ["reply_pwd"], // 错误信息会绑定在 reply_pwd 字段上
});

type FormValues = z.infer<typeof formSchema>;


export function ResetUserDialog({ info, disabled }: {
  info: UserInfo
  disabled: boolean
}) {

  const { change } = useUserAction();

  const [ open, setOpen ] = useState(false);

  const { handleSubmit, register, reset, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: '', reply_pwd: '' }
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = async ({ password }: FormValues) => {
    change.mutate({
      user_id: info.id,
      password,
    }, {
      onSuccess: () => {
        toast.success('密码修改成功，请重新登录');
        setOpen(false);
      },
      onError: (err) => {
        toast.error(err.message || "修改失败");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled}
                className="h-8 w-8 text-muted-foreground hover:text-primary">
          <RotateCcwKeyIcon className="h-4 w-4"/>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>重置密码</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            请输入新密码。
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
                autoComplete={'off'}
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
                autoComplete={'off'}
              />
              {errors.reply_pwd && <FieldError errors={[ errors.reply_pwd ]}/>}
            </Field>
          </FieldGroup>

          <DialogFooter className="pt-4">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={change.isPending}>
              {change.isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              确认修改
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

}
