'use client';

import Cookies from 'js-cookie';
import { useEffect } from 'react';

import { useRouter } from 'next/navigation'

export default function RootPage() {

  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get('token');
    if (token) {
      router.replace('/chat');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return null;
}
