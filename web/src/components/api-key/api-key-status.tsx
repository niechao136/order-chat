'use client';

import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';

import { ApiKeyInfo } from '@/types/api-key';


export type KeyStatus = 'active' | 'disabled' | 'expired' | 'expiring';


export const getKeyStatus = (key: ApiKeyInfo): { status: KeyStatus; label: string } => {
  if (!key.is_active) return { status: 'disabled', label: '已禁用' };
  const now = new Date();
  if (key.expires_at && new Date(key.expires_at) < now)
    return { status: 'expired', label: '已过期' };
  if (key.expires_at && new Date(key.expires_at) < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))
    return { status: 'expiring', label: '即将过期' };
  return { status: 'active', label: '有效' };
};


export function ApiKeyStatus({ info }: {
  info: ApiKeyInfo
}) {

  const statusInfo = useMemo(() => getKeyStatus(info), [info]);

  // 根据状态映射 Badge 变体和样式
  const variantMap: Record<KeyStatus, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
    active: { variant: 'default', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
    disabled: { variant: 'secondary' },
    expired: { variant: 'destructive' },
    expiring: { variant: 'outline', className: 'border-yellow-500 text-yellow-600 bg-yellow-50' },
  };

  const { variant, className } = variantMap[statusInfo.status];

  return (
    <Badge variant={variant} className={className}>
      {statusInfo.label}
    </Badge>
  );
}
