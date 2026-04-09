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
  AvatarFallback,
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
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

  const [open, setOpen] = useState(false);

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
                    <DropdownMenuItem>
                      <SidebarMenuButton>
                        <Link href={'/overview'}>
                          <BoltIcon/>
                          管理中心
                        </Link>
                      </SidebarMenuButton>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}
              {mode === 'admin' && (
                <>
                  <DropdownMenuSeparator/>
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <SidebarMenuButton>
                        <Link href={'/chat'}>
                          <MessageSquareIcon/>
                          聊天应用
                        </Link>
                      </SidebarMenuButton>
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
