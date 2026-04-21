'use client';

import { FileTextIcon, Loader2Icon, MessageSquareQuoteIcon, SearchIcon, RotateCcwIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

import { FilterBuilder } from '@/components/dataset/filter-builder';

import { useRecordField, useRecordActions } from '@/hooks/use-dataset';
import { ScoredPoint, FilterCondition, FieldItem, FieldType } from '@/types/dataset';


export function SearchDataset({ collection }: {
  collection: string
}) {

  const { search } = useRecordActions(collection);
  const { data: fieldList = [] } = useRecordField(collection);

  // 构建字段名数组和类型映射
  const fieldNames = fieldList.map((f: FieldItem) => f.field_name);
  const fieldTypes = fieldList.reduce<Record<string, FieldType>>((acc, f) => {
    acc[f.field_name] = f.field_type;
    return acc;
  }, {});

  const [ text, setText ] = useState('');
  const [ topK, setTopK ] = useState(5);
  const [ result, setResult ] = useState<ScoredPoint[]>([]);
  const [ searched, setSearched ] = useState(false);
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);

  const handleReset = () => {
    setText('');
    setTopK(3);
    setResult([]);
    setSearched(false);
    setFilterConditions([]);
  };

  const testSearch = () => {
    if (!text.trim()) {
      toast.warning('请输入检索内容');
      return;
    }

    const filters = filterConditions.filter(c => c.field.trim() !== '');

    search.mutate({ text, top_k: topK, filters }, {
      onSuccess: (res) => {
        setResult(res.data);
        setSearched(true);
        toast.success('检索成功');
      },
      onError: () => {
        setSearched(true);
      }
    });
  };

  return (
    <Card className="h-full shadow-sm border-primary/10 flex flex-col overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <SearchIcon className="h-4 w-4 text-primary"/> 检索实验室
        </CardTitle>
        <CardDescription>
          测试 RAG 的检索召回效果，拖动滑块调整 Top-K 数量（1-10）
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-6 min-h-0 pt-0">
        {/* 输入区域 */}
        <div className="flex gap-2 shrink-0 items-center">
          <Input
            placeholder="输入问题模拟用户提问..."
            className="flex-1"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && testSearch()}
          />
          <Button onClick={testSearch} disabled={search.isPending}>
            {search.isPending ? (
              <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <SearchIcon className="h-4 w-4 mr-2" />
            )}
            检索
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={search.isPending}>
            <RotateCcwIcon className="h-4 w-4 mr-2"/>
            重置
          </Button>
        </div>

        {/* Slider 滑块区域 */}
        <div className="flex items-center gap-4 px-1">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Top-K
          </span>
          <Slider
            value={[topK]}
            onValueChange={(value) => setTopK(value[0])}
            min={1}
            max={10}
            step={1}
            className="w-full max-w-xs"
          />
          <span className="text-sm font-semibold text-primary min-w-8 text-center">
            {topK}
          </span>
        </div>

        {/* 筛选条件构建器 */}
        <div className="shrink-0 border rounded-lg p-4 bg-muted/20">
          <FilterBuilder
            availableFields={fieldNames}
            conditions={filterConditions}
            fieldTypes={fieldTypes}
            onChange={setFilterConditions}
          />
        </div>

        {/* 结果展示区 */}
        <div className="flex-1 overflow-y-auto pr-2">
          {!searched ? (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl opacity-30 gap-4">
              <MessageSquareQuoteIcon className="h-12 w-12" />
              <p className="text-sm font-medium">
                输入问题并检索，查看向量匹配结果及置信度分数
              </p>
            </div>
          ) : result.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl opacity-50 gap-4">
              <FileTextIcon className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                未找到匹配的文档片段，请尝试更换关键词
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {result.map((res, i) => (
                <div
                  key={i}
                  className="flex flex-col h-full rounded-xl border bg-card shadow-sm hover:border-primary/30 transition-all overflow-hidden"
                >
                  <div className="p-3 border-b bg-muted/40 flex justify-between items-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-mono uppercase">
                      Rank #{i + 1}
                    </span>
                    <div className="text-xs font-bold text-primary">
                      Score: {(res.score * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div className="p-4 flex-1">
                    <div className="flex items-start gap-2 text-muted-foreground mb-2">
                      <FileTextIcon className="h-3 w-3 mt-1 shrink-0" />
                      <span className="text-[10px] uppercase font-semibold">
                        Document Fragment
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-foreground antialiased italic">
                      {res.payload.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
