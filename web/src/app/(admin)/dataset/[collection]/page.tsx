'use client';

import { useState } from 'react';
import { ListFilterIcon, BarChart3Icon } from 'lucide-react';

import { useParams } from 'next/navigation';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { DatasetTable } from '@/components/dataset/dataset-table';
import { SearchDataset } from '@/components/dataset/search-dataset';


export default function DatasetDetailPage() {
  const params = useParams();
  const collection = params.collection as string;

  const [tab, setTab] = useState('manage');

  return (
    <div className="p-6 flex flex-col gap-4 bg-background">
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          {/* Tab 切换控制 */}
          <TabsList className="grid w-[400px] grid-cols-2">
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <ListFilterIcon className="h-4 w-4" /> 向量管理
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <BarChart3Icon className="h-4 w-4" /> 召回测试
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- Tab 1: 向量管理 --- */}
        <TabsContent value="manage" className="flex-1 flex flex-col gap-4 mt-0 mb-4">
          <DatasetTable collection={collection}/>
        </TabsContent>

        {/* --- Tab 2: 召回测试 --- */}
        <TabsContent value="test" className="flex-1 mt-0">
          <SearchDataset collection={collection}/>
        </TabsContent>
      </Tabs>
    </div>
  );
}
