'use client';

import { EyeIcon, FileTextIcon, CopyIcon } from 'lucide-react';
import { toast } from 'sonner';

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


export function ViewItemDialog({ content }: {
  content: string
}) {

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    toast.success("内容已复制到剪贴板");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary">
          <EyeIcon className="h-4 w-4"/>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="h-5 w-5"/> 向量原文详情
          </DialogTitle>
          <DialogDescription>
            以下是该向量数据的完整原文内容，您可以阅读或复制使用。
          </DialogDescription>
        </DialogHeader>
        <div
          className="bg-muted/30 p-4 rounded-lg border text-sm leading-loose whitespace-pre-wrap">
          {content}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <CopyIcon className="mr-2 h-3 w-3"/> 复制全文
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
