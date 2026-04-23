'use client';

import debounce from 'lodash/debounce';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CopyIcon,
  DatabaseIcon,
  SearchIcon,
} from 'lucide-react';
import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { TablePaging } from '@/components/base/pagination';
import { AddApiKey } from '@/components/api-key/add-api-key';
import { ApiKeyStatus } from '@/components/api-key/api-key-status';
import { BatchDeleteApiKey } from '@/components/api-key/batch-delete-api-key';
import { DeleteApiKey } from '@/components/api-key/delete-api-key';
import { ToggleApiKey } from '@/components/api-key/toggle-api-key';

import { useApiKey } from '@/hooks/use-api-key';
import { usePagingStore } from '@/stores/paging';
import { formatTimeStr } from '@/utils/time';


type SortableField = 'name' | 'is_active' | 'expires_at' | 'last_used_at' | 'created_at';

export default function ApiKeysPage() {

  const pagingKey = 'api-key';
  const { page, size, order_by, direction, keyword } = usePagingStore((state) => state.getPaging(pagingKey));
  const { setSize, setPage, setSort, setSearch, initPaging } = usePagingStore();

  useEffect(() => {
    initPaging(pagingKey);
  }, [ initPaging, pagingKey ]);

  const params = useMemo(() => ({
    page,
    size,
    order_by,
    direction,
    keyword,
  }), [page, size, order_by, direction, keyword]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading } = useApiKey(params);

  const debouncedSetSearch = useMemo(() => {
    return debounce((value: string) => setSearch(pagingKey, value), 500)
  }, [ setSearch, pagingKey ]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    debouncedSetSearch(value);
  };

  const handleSearchSubmit = () => {
    debouncedSetSearch.cancel();
    setSearch(pagingKey, keyword);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const handleSort = (field: SortableField) => {
    let newDirection: 'asc' | 'desc' | '' = 'asc';
    if (order_by === field) {
      // 相同字段：无排序 → 升序 → 降序 → 无排序（循环）
      if (direction === '') newDirection = 'asc';
      else if (direction === 'asc') newDirection = 'desc';
      else newDirection = '';
    }
    setSort(pagingKey, field, newDirection);
  };

  const renderSortIcon = (field: SortableField) => {
    if (order_by !== field) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />;
    }
    if (direction === 'asc') {
      return <ArrowUp className="ml-1 h-3.5 w-3.5" />;
    }
    if (direction === 'desc') {
      return <ArrowDown className="ml-1 h-3.5 w-3.5" />;
    }
    return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />;
  };

  const sortableHeaderClass = "cursor-pointer select-none hover:bg-muted/50 transition-colors";

  const allowCheck = useMemo(() => {
    return (data?.data ?? [])
      .filter(o => !o.is_active || (o.expires_at && new Date(o.expires_at) < new Date()))
      .map(r => r.id)
  }, [data]);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('密钥已复制到剪贴板');
  };

  return (
    <div className="p-6 flex flex-col gap-4 bg-background">
      <Card className="flex-1 flex flex-col shadow-sm overflow-hidden">
        <CardHeader className="py-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">现有密钥</CardTitle>
            <CardDescription>所有已创建的 API 密钥，可随时停用或删除。</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Input
                placeholder="搜索名称/描述"
                value={keyword || ''}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                className="pr-8"
              />
              <button
                type="button"
                onClick={handleSearchSubmit}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <SearchIcon className="h-4 w-4"/>
              </button>
            </div>
            <AddApiKey/>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 pt-0">
          <div className="rounded-md border flex-1 overflow-auto relative">
            <Table className="table-fixed w-full">
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[48px] text-center">
                    <Checkbox
                      disabled={allowCheck.length === 0}
                      checked={selectedIds.length > 0 && selectedIds.length === allowCheck.length}
                      onCheckedChange={() => setSelectedIds(selectedIds.length === allowCheck.length ? [] : allowCheck)}
                    />
                  </TableHead>
                  <TableHead className={sortableHeaderClass} onClick={() => handleSort('name')}>
                    <div className="flex items-center">
                      名称 {renderSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead>密钥</TableHead>
                  <TableHead className={`w-[140px]`}>
                    <div className="flex items-center">
                      状态
                    </div>
                  </TableHead>
                  <TableHead className={`${sortableHeaderClass}`} onClick={() => handleSort('expires_at')}>
                    <div className="flex items-center">
                      过期时间 {renderSortIcon('expires_at')}
                    </div>
                  </TableHead>
                  <TableHead className={`${sortableHeaderClass}`} onClick={() => handleSort('last_used_at')}>
                    <div className="flex items-center">
                      最后使用 {renderSortIcon('last_used_at')}
                    </div>
                  </TableHead>
                  <TableHead className={`${sortableHeaderClass}`} onClick={() => handleSort('created_at')}>
                    <div className="flex items-center">
                      创建时间 {renderSortIcon('created_at')}
                    </div>
                  </TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead className="w-[140px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="h-64 text-center">加载中...</TableCell></TableRow>
                ) : data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 opacity-50">
                        <DatabaseIcon className="h-8 w-8"/>
                        <p> API 密钥，点击上方按钮创建。</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data.map((api_key) => (
                    <TableRow key={api_key.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center">
                        <Checkbox
                          disabled={!allowCheck.includes(api_key.id)}
                          checked={selectedIds.includes(api_key.id)}
                          onCheckedChange={() => setSelectedIds(prev => prev.includes(api_key.id) ? prev.filter(i => i !== api_key.id) : [ ...prev, api_key.id ])}
                        />
                      </TableCell>
                      <TableCell className="py-4">
                        {api_key.name}
                      </TableCell>
                      <TableCell className="py-4">
                        <code className="bg-muted px-2 py-1 rounded text-xs">
                          {api_key.prefix}****
                        </code>
                      </TableCell>
                      <TableCell className="py-4">
                        <ApiKeyStatus info={api_key}/>
                      </TableCell>
                      <TableCell className="py-4">
                        {api_key.expires_at ? formatTimeStr(api_key.expires_at) : '永不过期'}
                      </TableCell>
                      <TableCell className="py-4">
                        {api_key.last_used_at ? formatTimeStr(api_key.last_used_at) : '从未使用'}
                      </TableCell>
                      <TableCell className="py-4">
                        {formatTimeStr(api_key.created_at)}
                      </TableCell>
                      <TableCell className="py-4">
                        {api_key.description}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <ToggleApiKey info={api_key}/>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            title={'复制密钥'}
                            onClick={() => copyToClipboard(api_key.key)}>
                            <CopyIcon className="h-4 w-4"/>
                          </Button>
                          <DeleteApiKey info={api_key} disabled={!allowCheck.includes(api_key.id)}/>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <TablePaging
            total={data?.total ?? 0}
            page={page}
            setPage={(page) => setPage(pagingKey, page)}
            size={size}
            setSize={(size) => setSize(pagingKey, size)}
          />
        </CardContent>
      </Card>

      {/* 批量操作（仅在选中时浮现） */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl z-50 animate-in fade-in zoom-in">
          <span className="text-sm font-medium">已选中 {selectedIds.length} 个密钥</span>
          <div className="w-px h-4 bg-slate-700"/>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-slate-800"
            onClick={() => setSelectedIds([])}>
            取消
          </Button>
          <BatchDeleteApiKey ids={selectedIds} callback={() => setSelectedIds([])}/>
        </div>
      )}
    </div>
  );

}
