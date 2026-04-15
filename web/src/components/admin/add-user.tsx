'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, Loader2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

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
import { Field, FieldLabel, FieldGroup, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useUserAction } from '@/hooks/use-user';


// 定义表单校验逻辑
const formSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, { message: '用户名至少 2 个字符' })
    .max(20, { message: '用户名最多 20 个字符' }),
  // 邮箱非必填：允许为空字符串或 undefined，但如果填了，必须是邮箱格式
  email: z
    .union([
      z.email({ message: '邮箱格式不正确' }),
      z.literal(''),
      z.undefined()
    ])
    .optional(),
  role: z
    .string()
    .trim()
    .min(1, { message: '请选择权限' }),
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


export function AddUserDialog() {

  const { add, jumpToFirst } = useUserAction();

  const [ open, setOpen ] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', email: '', role: 'user', password: '', reply_pwd: '' },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    const req = {
      username: values.username,
      email: values.email,
      password: values.password,
      role: values.role,
    }
    // 调用 Mutation
    add.mutate(JSON.stringify(req), {
      onSuccess: async () => {
        await jumpToFirst();
        toast.success(`用户创建成功`);
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
          <PlusIcon className="mr-2 h-4 w-4"/> 新增用户
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>创建新用户</DialogTitle>
          <DialogDescription>
            请填写下方的表单，创建用户。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <FieldGroup>
            <Field data-invalid={!!errors.username}>
              <FieldLabel htmlFor="username">用户名</FieldLabel>
              <Input
                {...register('username')}
                id="username"
                placeholder="请输入用户名"
              />
              {errors.username && <FieldError errors={[ errors.username ]}/>}
            </Field>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">邮箱</FieldLabel>
              <Input
                {...register('email')}
                id="email"
                placeholder="请输入邮箱"
              />
              {errors.email && <FieldError errors={[ errors.email ]}/>}
            </Field>
            <Field data-invalid={!!errors.role}>
              <FieldLabel>权限</FieldLabel>
              <Controller
                control={control}
                name={'role'}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                      {[ 'admin', 'user' ].map((item) => (
                        <SelectItem key={item} value={item} className="text-xs">
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && <FieldError errors={[ errors.role ]}/>}
            </Field>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">密码</FieldLabel>
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
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
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
  );
}
