'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Edit3Icon, Loader2Icon } from 'lucide-react';
import { useState } from 'react';
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
import { UserInfo } from '@/types/user';


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
});

type FormValues = z.infer<typeof formSchema>;


export function EditUserDialog({ info, disabled }: {
  info: UserInfo
  disabled: boolean
}) {

  const { update, jumpToFirst } = useUserAction();

  const [ open, setOpen ] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: info.username,
      email: info.email,
      role: info.role,
    },
  });

  const onSubmit = async (values: FormValues) => {
    const req = {
      username: values.username,
      email: values.email,
      role: values.role,
    }
    // 调用 Mutation
    update.mutate({
      user_id: info.id,
      body: JSON.stringify(req)
    }, {
      onSuccess: async () => {
        await jumpToFirst();
        toast.success(`用户修改成功`);
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
          <DialogTitle>编辑用户信息</DialogTitle>
          <DialogDescription>
            您可以修改用户的邮箱、权限。
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
                disabled={true}
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
                    disabled={disabled}
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
          </FieldGroup>

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
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin"/>
              )}
              保存修改
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

}
