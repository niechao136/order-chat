'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import { RequiredPageParams } from '@/types/api';

interface PagingProp {
  total: number | null;
  page: RequiredPageParams;
  setPage: (page: RequiredPageParams) => void;
}

export function TablePaging({ page, setPage, total }: PagingProp) {
  // 内部状态用于管理跳转输入框的值
  const [jumpPage, setJumpPage] = useState('');

  const totalPage = useMemo(() => {
    if (!total) return 1;
    return Math.ceil(total / page.size);
  }, [total, page.size]);

  // 当外部页码改变时，同步清空或更新跳转输入框（可选）
  useEffect(() => {
    setJumpPage('');
  }, [page.page]);

  const handleJump = () => {
    const target = parseInt(jumpPage);
    if (!isNaN(target) && target >= 1 && target <= totalPage) {
      setPage({ ...page, page: target });
    } else {
      setJumpPage(''); // 输入非法则清空
    }
  };

  const renderPages = () => {
    const pages = [];
    const { page: current } = page;
    for (let i = 1; i <= totalPage; i++) {
      if (i === 1 || i === totalPage || (i >= current - 1 && i <= current + 1)) {
        pages.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              isActive={current === i}
              onClick={(e) => {
                e.preventDefault();
                setPage({ ...page, page: i });
              }}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      } else if (i === current - 2 || i === current + 2) {
        pages.push(
          <PaginationItem key={`ellipsis-${i}`}>
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between py-4">
      {/* 左侧：总量 */}
      <div className="flex items-center gap-6">
        <p className="text-xs text-muted-foreground font-mono shrink-0">
          Total: {total || 0}
        </p>
      </div>

      {/* 右侧：分页控制 + 跳转功能 + Size 切换 */}
      <div className="flex items-center gap-4">
        <Pagination className="w-auto mx-0">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page.page > 1) setPage({ ...page, page: page.page - 1 });
                }}
                aria-disabled={page.page <= 1}
                className={page.page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>

            {renderPages()}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page.page < totalPage) setPage({ ...page, page: page.page + 1 });
                }}
                aria-disabled={page.page >= totalPage}
                className={page.page >= totalPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>

        {/* --- 跳转指定页 --- */}
        <div className="flex items-center gap-2 ml-2 border-l pl-4">
          <span className="text-xs text-muted-foreground shrink-0">跳转至</span>
          <Input
            type="text"
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value.replace(/\D/g, ''))} // 只允许输入数字
            onKeyDown={(e) => e.key === 'Enter' && handleJump()}
            className="h-8 w-12 text-xs text-center p-0"
          />
          <span className="text-xs text-muted-foreground shrink-0">页</span>
        </div>

        {/* Size 切换 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">每页显示</span>
          <Select
            value={page.size.toString()}
            onValueChange={(value) => {
              setPage({ ...page, size: parseInt(value), page: 1 });
            }}
          >
            <SelectTrigger className="h-8 w-[70px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={size.toString()} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
