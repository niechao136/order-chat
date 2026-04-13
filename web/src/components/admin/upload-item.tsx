'use client';

import { UploadIcon, Loader2Icon } from 'lucide-react';
import { useRef, ChangeEvent } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useRecordActions } from '@/hooks/use-dataset';
import { usePagingStore } from '@/stores/paging';


export function UploadItem({ collection }: {
  collection: string
}) {

  const pagingKey = `dataset_${collection}`;

  const { setPage } = usePagingStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { upload } = useRecordActions(collection);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    upload.mutate(formData, {
      onSuccess: () => {
        setPage(pagingKey, 1);
        toast.success("上传成功");
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={upload.isPending}
      >
        {upload.isPending ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin"/> : <UploadIcon className="mr-2 h-4 w-4"/>}
        批量上传
      </Button>
    </>
  )
}
