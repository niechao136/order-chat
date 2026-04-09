'use client';

import {
  BoltIcon,
  ChevronsUpDownIcon,
  KeyRoundIcon,
  LogOutIcon,
  MessageSquareIcon
} from 'lucide-react';
import { useState } from 'react'

import Link from 'next/link';

import {
  Avatar,
  AvatarFallback
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';
import { ChangePassword } from '@/components/base/change-pwd'
import { handleLogout } from '@/services/api';
import { UserInfo } from '@/types/user';
import { getInitials } from '@/utils/string';


export function NavUser({ mode, owner }: {
  mode: 'chat' | 'admin';
  owner: UserInfo | null;
}) {

  const { isMobile } = useSidebar();

  const [ open, setOpen ] = useState(false);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">{getInitials(owner?.username ?? '')}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{owner?.username}</span>
                  <span className="truncate text-xs">{owner?.email}</span>
                </div>
                <ChevronsUpDownIcon className="ml-auto size-4"/>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? 'bottom' : 'right'}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">{getInitials(owner?.username ?? '')}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{owner?.username}</span>
                    <span className="truncate text-xs">{owner?.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              {owner?.role === 'admin' && mode === 'chat' && (
                <>
                  <DropdownMenuSeparator/>
                  <DropdownMenuGroup>
                    {/* 使用 asChild 避免嵌套多层 div，并确保水平布局 */}
                    <DropdownMenuItem asChild>
                      <Link href="/overview" className="flex w-full items-center gap-2">
                        <BoltIcon className="size-4"/>
                        <span>管理中心</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}
              {mode === 'admin' && (
                <>
                  <DropdownMenuSeparator/>
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/chat" className="flex w-full items-center gap-2">
                        <MessageSquareIcon className="size-4"/>
                        <span>聊天应用</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}
              <DropdownMenuSeparator/>
              <DropdownMenuItem onClick={() => setOpen(true)}>
                <KeyRoundIcon/>
                修改密码
              </DropdownMenuItem>
              <DropdownMenuSeparator/>
              <DropdownMenuItem onClick={() => handleLogout()}>
                <LogOutIcon/>
                登出
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <ChangePassword open={open} onOpenChange={setOpen}/>
    </>
  )
}
