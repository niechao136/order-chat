'use client';

import {
  DatabaseSearchIcon,
  KeyRoundIcon,
  UserRoundIcon,
} from 'lucide-react';
import { useMemo, ReactNode, Fragment } from 'react';

import { useParams, usePathname } from 'next/navigation';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/sidebar';
import { useDatasetList } from '@/hooks/use-dataset';
import { useOwner } from '@/hooks/use-user';
import { NavItem } from '@/types/ui';


export function AdminBody({ children }: {
  children: ReactNode;
}) {
  const params = useParams();
  const dataset = params.dataset as string;
  const pathname = usePathname();

  const { data: datasets } = useDatasetList();
  const { data: owner } = useOwner();

  const nav = useMemo(() => {
    const nav_d = (datasets ?? []).map(item => {
      return {
        href: `/dataset/${item.name}`,
        title: item.name,
      } as NavItem;
    })
    const list: NavItem[] = [
      {
        title: '知识库管理',
        icon: DatabaseSearchIcon,
        children: [
          {
            href: '/dataset',
            title: '知识库总览'
          },
          ...nav_d,
        ]
      },
      {
        href: '/user',
        title: '用户管理',
        icon: UserRoundIcon,
      },
      {
        href: '/api-key',
        title: '密钥管理',
        icon: KeyRoundIcon,
      },
    ];
    return list;
  }, [datasets]);

  const title = useMemo(() => {
    const breadcrumbs: string[] = [];

    if (!!dataset) {
      const parent = nav.find(item =>
        item.children?.some(child => child.href?.includes(dataset))
      );
      if (parent) breadcrumbs.push(parent.title);
      breadcrumbs.push(dataset);
      return breadcrumbs;
    }

    const activeNav = nav.find(item => item.href === pathname);

    if (activeNav) {
      breadcrumbs.push(activeNav.title);
      return breadcrumbs;
    }

    const parent = nav.find(item =>
      item.children?.some(child => child.href === pathname)
    );
    if (parent) {
      const child = parent.children?.find(c => c.href === pathname);
      breadcrumbs.push(parent.title);
      if (child) breadcrumbs.push(child.title);
    }
    return breadcrumbs
  }, [dataset, pathname, nav]);

  return (
    <SidebarProvider>
      <AdminSidebar
        nav={nav ?? []}
        owner={owner ?? null}
      />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <header
          className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1"/>
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4 data-vertical:self-center"
            />
            <Breadcrumb>
              <BreadcrumbList>
                {title.map((text, index) => (
                  <Fragment key={text}>
                    {index > 0 && <BreadcrumbSeparator/>}
                    <BreadcrumbItem key={text}>
                      <BreadcrumbPage>{text}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
