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
import { useChatAction } from '@/hooks/use-chat';
import { login } from '@/services/auth'

// 定义表单校验规则
const formSchema = z.object({
  username: z.string().trim().min(1, { message: '用户名不能为空' }),
  password: z.string().trim().min(1, { message: '密码不能为空' })
});

export default function LoginPage() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', password: '' }
  });
  const { formState: { isSubmitting } } = form;
  const { fetchGraph } = useChatAction()

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const data = await login(JSON.stringify(values))

    if (!data?.access_token) {
      toast.error('登录失败，请检查账号密码')
      return
    }

    Cookies.set('token', data.access_token, { expires: 1, path: '/' });

    const graph = await fetchGraph()

    if (!graph?.[0]) {
      toast.error('目前没有可用的 Graph')
      return
    }

    router.push(`/chat/${graph[0]}`);
  }

  return (
    <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center">欢迎回来</CardTitle>
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
            </FieldGroup>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? '正在登录...' : '立即登录'}
            </Button>
          </FieldSet>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-slate-500">
        还没有账号？<Link href={'/register'} className="text-blue-600 hover:underline ml-1">立即注册</Link>
      </CardFooter>
    </Card>
  );
}
