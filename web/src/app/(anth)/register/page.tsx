'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Cookies from 'js-cookie';
import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel, FieldGroup, FieldSet, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useFetch } from '@/hooks/use-query';
import { register } from '@/services/auth';

const formSchema = z.object({
  username: z
    .string()
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

export default function RegisterPage() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', password: '', reply_pwd: '' }
  });
  const { formState: { isSubmitting } } = form;
  const { fetchGraph } = useFetch()

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const req = {
      username: values.username,
      email: values.email,
      password: values.password
    }

    const data = await register(JSON.stringify(req))

    if (!data?.access_token) {
        toast.error('登录失败，请检查账号密码')
        return
      }

    Cookies.set('token', data.access_token, { expires: 1, path: '/' });

    const { graph } = await fetchGraph()

    if (!graph[0]) {
      toast.error('目前没有可用的 Graph')
      return
    }

    router.push(`/${graph[0]}`);
  }

  return (
    <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center">欢迎注册</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} method={'POST'}>
          <FieldSet>
            <FieldGroup>
              <Controller
                name={'username'}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={'username'}>用户名</FieldLabel>
                    <Input
                      {...field}
                      id={'username'}
                      aria-invalid={fieldState.invalid}
                      placeholder={'请输入用户名'}
                      autoComplete={'off'}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[ fieldState.error ]}/>
                    )}
                  </Field>
                )}
              />
               <Controller
                name={'email'}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={'email'}>邮箱</FieldLabel>
                    <Input
                      {...field}
                      id={'email'}
                      aria-invalid={fieldState.invalid}
                      placeholder={'请输入邮箱'}
                      autoComplete={'off'}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[ fieldState.error ]}/>
                    )}
                  </Field>
                )}
              />
              <Controller
                name={'password'}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={'password'}>密码</FieldLabel>
                    <Input
                      {...field}
                      id={'password'}
                      type={'password'}
                      aria-invalid={fieldState.invalid}
                      placeholder={'请输入密码'}
                      autoComplete={'off'}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[ fieldState.error ]}/>
                    )}
                  </Field>
                )}
              />
              <Controller
                name={'reply_pwd'}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={'reply_pwd'}>重复密码</FieldLabel>
                    <Input
                      {...field}
                      id={'reply_pwd'}
                      type={'password'}
                      aria-invalid={fieldState.invalid}
                      placeholder={'请再次输入密码'}
                      autoComplete={'off'}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[ fieldState.error ]}/>
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? '正在注册...' : '立即注册'}
            </Button>
          </FieldSet>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-slate-500">
        已有账号！<Link href={'/login'} className="text-blue-600 hover:underline ml-1">立即登录</Link>
      </CardFooter>
    </Card>
  );
}
