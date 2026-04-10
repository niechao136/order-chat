'use client';

import {
  DatabaseIcon,
  ExternalLinkIcon,
  Loader2Icon,
  SearchIcon
} from 'lucide-react';
import { useState } from 'react';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AddDatasetDialog } from '@/components/admin/add-dataset';
import { DeleteDatasetDialog } from '@/components/admin/delete-dataset';

import { useColList } from '@/hooks/use-dataset';


export default function DatasetPage() {

  const { data: datasets, isLoading } = useColList();
  
  const [ search, setSearch ] = useState('');

  const filteredDatasets = datasets?.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground"/>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header 部分 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">知识库总览</h1>
          <p className="text-muted-foreground">
            管理您的向量集合，目前共有 {datasets?.length || 0} 个知识库
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
            <Input
              placeholder="搜索知识库..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <AddDatasetDialog />
        </div>
      </div>

      {/* 列表部分 */}
      {filteredDatasets?.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed text-center">
          <DatabaseIcon className="h-10 w-10 text-muted-foreground mb-4"/>
          <h3 className="text-lg font-medium">暂无知识库</h3>
          <p className="text-sm text-muted-foreground">开始创建一个新的知识库来存储您的向量数据吧。</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDatasets?.map((col) => (
            <Card key={col.name} className="group transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold truncate pr-4">
                  {col.name}
                </CardTitle>
                <DatabaseIcon className="h-4 w-4 text-muted-foreground"/>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  存储类型: Vector Storage
                </CardDescription>
              </CardContent>
              <CardFooter className="flex justify-between">
                {/* 详情入口 */}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dataset/${col.name}`}>
                    <ExternalLinkIcon className="mr-2 h-3 w-3"/>
                    查看详情
                  </Link>
                </Button>

                {/* 删除确认 */}
                <DeleteDatasetDialog name={col.name}/>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
