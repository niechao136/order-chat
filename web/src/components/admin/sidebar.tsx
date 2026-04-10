'use client';

import {
  ChevronRightIcon,
  GalleryVerticalEndIcon,
} from 'lucide-react';

import Link from 'next/link';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
} from '@/components/ui/sidebar';
import { NavUser } from '@/components/base/nav-user';
import { NavItem } from '@/types/ui';
import { UserInfo } from '@/types/user';


function NoChild({ nav }: { nav: NavItem }) {
  const { icon: Icon } = nav;
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={nav.title}>
          <Link href={nav.href ?? ''}>
            {Icon && <Icon className="size-4" />}
            <span>{nav.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function HasChild({ nav }: { nav: NavItem }) {
  const { icon: Icon } = nav;
  return (
    <SidebarMenu>
      <Collapsible asChild defaultOpen={false} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={nav.title}>
              {Icon && <Icon className="size-4" />}
              <span>{nav.title}</span>
              <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {(nav.children ?? []).map((item) => (
                <SidebarMenuSubItem key={item.title}>
                  <SidebarMenuSubButton asChild>
                    <Link href={item.href ?? ''}>
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarMenu>
  );
}


export function AdminSidebar({ owner, nav }: {
  owner: UserInfo | null;
  nav: NavItem[]
}) {

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuButton size={'lg'} asChild>
            <Link href={'/overview'}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <GalleryVerticalEndIcon className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">{'管理中心'}</span>
              </div>
            </Link>
          </SidebarMenuButton>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {nav.map((item, index) => {
          const itemKey = item.href || item.title || index;
          return Array.isArray(item.children) ? (
            <HasChild key={itemKey} nav={item}/>
          ) : (
            <NoChild key={itemKey} nav={item}/>
          )
        })}
      </SidebarContent>
      <SidebarFooter>
        <NavUser mode={'admin'} owner={owner}/>
      </SidebarFooter>
      <SidebarRail/>
    </Sidebar>
  )
}
