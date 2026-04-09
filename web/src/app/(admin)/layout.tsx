import { ReactNode } from 'react';

import { AdminBody } from '@/components/admin/body';

export default async function AdminLayout({ children }: {
  children: ReactNode;
}) {
  return (
    <AdminBody>{children}</AdminBody>
  )
}
