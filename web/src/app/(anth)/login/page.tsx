'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Cookies from 'js-cookie';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel, FieldGroup, FieldSet, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAuthAction } from '@/hooks/use-auth';
import { useGraph } from '@/hooks/use-chat';

// 定义表单校验规则
const formSchema = z.object({
  username: z.string().trim().min(1, { message: '用户名不能为空' }),
  password: z.string().trim().min(1, { message: '密码不能为空' })
});

type FormValues = z.infer<typeof formSchema>;

const graph = typeof window !== 'undefined'
  ? localStorage.getItem('login_redirect_graph') || null
  : null;


export default function LoginPage() {
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', password: '' }
  });

  const { signIn, clearCache } = useAuthAction();
  const { data: graphs } = useGraph();

  async function onSubmit(values: FormValues) {
    const body = JSON.stringify(values);
    signIn.mutate(body, {
      onSuccess: async (res) => {
        Cookies.set('token', res?.data ?? '', { expires: 1, path: '/' });

        await clearCache();

        if (!graphs?.[0]) {
          toast.error('目前没有可用的 Graph');
          return;
        }

        const def = graphs?.includes(graph ?? '') ? graph : graphs?.[0];
        localStorage.removeItem('login_redirect_graph');

        router.push(`/chat/${def}`);
      },
      onError: (err) => {
        toast.error(err?.message || '登录失败，请检查账号密码');
      },
    });
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
              disabled={signIn.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700">
              {signIn.isPending ? '正在登录...' : '立即登录'}
            </Button>
          </FieldSet>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-slate-500">
        还没有账号？
        <Link
          href={`/register`}
          className="text-blue-600 hover:underline ml-1">
          立即注册
        </Link>
      </CardFooter>
    </Card>
  );
}
