'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { SettingsIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';



// 定义表单校验逻辑
const formSchema = z.object({
  lang: z
    .string()
    .trim()
    .min(1, { message: '请输入语言代码' }),
  collection_name: z
    .string()
    .trim()
    .min(1, { message: '请选择知识库' }),
});

type FormValues = z.infer<typeof formSchema>;

interface ChatConfigProp {
  disabled: boolean
  lang: string
  collection_name: string
  collections: string[]
  setConfig: (lang: string, collection_name: string) => void
}

export function ChatConfig({ collection_name, collections, disabled, lang, setConfig }: ChatConfigProp) {

  const [ open, setOpen ] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { lang: lang, collection_name: collection_name }
  });

  const onSubmit = (values: FormValues) => {
    setConfig(values.lang, values.collection_name);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm"
                className="h-8 w-8 text-muted-foreground hover:text-primary">
          <SettingsIcon className="h-4 w-4"/>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>聊天配置</DialogTitle>
          <DialogDescription>
            调整语言或切换知识库，点击保存即可生效。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <FieldGroup>
            <Field data-invalid={!!errors.lang}>
              <FieldLabel htmlFor="username">语言代码</FieldLabel>
              <Input
                {...register('lang')}
                id="lang"
                placeholder="请输入语言代码"
              />
              {errors.lang && <FieldError errors={[ errors.lang ]}/>}
            </Field>
            <Field data-invalid={!!errors.collection_name}>
              <FieldLabel>知识库</FieldLabel>
              <Controller
                control={control}
                name={'collection_name'}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                      {collections.map((item) => (
                        <SelectItem key={item} value={item} className="text-xs">
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.collection_name && <FieldError errors={[ errors.collection_name ]}/>}
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
            <Button type="submit" disabled={disabled}>
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
