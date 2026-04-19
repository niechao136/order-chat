'use client';

import debounce from 'lodash/debounce';
import { DatabaseIcon, Trash2Icon, ArrowUpDown, ArrowUp, ArrowDown, SearchIcon } from 'lucide-react';
import { useState, useMemo, useEffect, ChangeEvent, KeyboardEvent } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { AddUserDialog } from '@/components/user/add-user';
import { DeleteUserDialog } from '@/components/user/delete-user';
import { EditUserDialog } from '@/components/user/edit-user';
import { ResetUserDialog } from '@/components/user/reset-user';

import { useUserList, useUserAction, useUserCount, useOwner } from '@/hooks/use-user';
import { usePagingStore } from '@/stores/paging';
import { formatTimeStr } from '@/utils/time';


type SortableField = 'username' | 'email' | 'role' | 'updated_at';


export default function UserPage() {

  const pagingKey = 'user';
  const { page, size, order_by, direction, keyword } = usePagingStore((state) => state.getPaging(pagingKey));
  const { setSize, setPage, setSort, setSearch, initPaging } = usePagingStore();

  useEffect(() => {
    initPaging(pagingKey);
  }, [initPaging, pagingKey]);

  const params = useMemo(() => ({
    page,
    size,
    order_by,
    direction,
    keyword,
  }), [page, size, order_by, direction, keyword]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading } = useUserList(params);
  const { data: total } = useUserCount();
  const { data: owner } = useOwner();
  const { remove, checkPage } = useUserAction();

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
    return (data?.data ?? []).filter(o => o.id !== owner?.id).map(r => r.id)
  }, [data, owner]);

  const batchDel = () => {
    remove.mutate(selectedIds, {
      onSuccess: async () => {
        await checkPage();
        toast.success(`批量删除成功`);
        setSelectedIds([]);
      },
      onError: (err: Error) => {
        toast.error(err.message || '批量删除失败');
      },
    });
  };

  return (
    <div className="p-6 flex flex-col gap-4 bg-background">
      <Card className="flex-1 flex flex-col shadow-sm overflow-hidden">
        <CardHeader className="py-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">用户列表</CardTitle>
            <CardDescription>管理系统中的 {total || 0} 个用户</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Input
                placeholder="搜索用户名/邮箱"
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
                <SearchIcon className="h-4 w-4" />
              </button>
            </div>
            <AddUserDialog/>
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
                  <TableHead className={sortableHeaderClass} onClick={() => handleSort('username')}>
                    <div className="flex items-center">
                      用户名 {renderSortIcon('username')}
                    </div>
                  </TableHead>
                  <TableHead className={sortableHeaderClass} onClick={() => handleSort('email')}>
                    <div className="flex items-center">
                      邮箱 {renderSortIcon('email')}
                    </div>
                  </TableHead>
                  <TableHead className={`${sortableHeaderClass} w-[140px]`} onClick={() => handleSort('role')}>
                    <div className="flex items-center">
                      权限 {renderSortIcon('role')}
                    </div>
                  </TableHead>
                  <TableHead className={`${sortableHeaderClass} w-[140px]`} onClick={() => handleSort('updated_at')}>
                    <div className="flex items-center">
                      更新时间 {renderSortIcon('updated_at')}
                    </div>
                  </TableHead>
                  <TableHead className="w-[140px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="h-64 text-center">加载中...</TableCell></TableRow>
                ) : data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 opacity-50">
                        <DatabaseIcon className="h-8 w-8"/>
                        <p>暂无用户，请先新增用户</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data.map((user) => (
                    <TableRow key={user.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center">
                        <Checkbox
                          disabled={owner?.id === user.id}
                          checked={selectedIds.includes(user.id)}
                          onCheckedChange={() => setSelectedIds(prev => prev.includes(user.id) ? prev.filter(i => i !== user.id) : [ ...prev, user.id ])}
                        />
                      </TableCell>
                      <TableCell className="py-4">{user.username}</TableCell>
                      <TableCell className="py-4">{user.email}</TableCell>
                      <TableCell className="py-4">{user.role}</TableCell>
                      <TableCell className="py-4">{formatTimeStr(user.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <EditUserDialog info={user} disabled={owner?.id === user.id}/>
                          <ResetUserDialog info={user} disabled={owner?.id === user.id}/>
                          <DeleteUserDialog info={user} disabled={owner?.id === user.id}/>
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
          <span className="text-sm font-medium">已选中 {selectedIds.length} 个用户</span>
          <div className="w-px h-4 bg-slate-700" />
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-slate-800"
            onClick={() => setSelectedIds([])}>
            取消
          </Button>
          <Button size="sm" variant="destructive" className="h-8" onClick={() => batchDel()}>
            <Trash2Icon className="mr-2 h-3.5 w-3.5" /> 批量删除
          </Button>
        </div>
      )}
    </div>
  )
}
