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
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { NavUser } from '@/components/base/nav-user';
import { NavItem } from '@/types/ui';
import { UserInfo } from '@/types/user';


function NoChild({ nav }: {
  nav: NavItem
}) {
  const { icon: Icon } = nav
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link href={nav.href ?? ''}>
            {Icon && <Icon/>}
            <span>{nav.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function HasChild({ nav }: {
  nav: NavItem
}) {
  const { icon: Icon } = nav
  return (
    <Collapsible defaultOpen={false} className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel
          asChild
          className="group/label text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <CollapsibleTrigger>
            {Icon && <Icon/>}
            {nav.title}{' '}
            <ChevronRightIcon className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90"/>
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {(nav.children ?? []).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.href ?? ''}>
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
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
        {nav.map(item => {
          return Array.isArray(item.children) ? (
            <HasChild nav={item}/>
          ) : (
            <NoChild nav={item}/>
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
