import Cookies from 'js-cookie';


export async function getToken() {

  if (typeof window === 'undefined') {
    // 服务端环境
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    return cookieStore.get('token')?.value ?? '';
  }

  // 客户端环境
  return Cookies.get('token') ?? '';
}


export function getBaseUrl() {

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}


export async function apiRequest(url: string, options: RequestInit = {}) {
  const token = await getToken();
  const baseUrl = getBaseUrl();
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;

  const defaultHeaders: HeadersInit = {
    'Authorization': `Bearer ${token}`,
  };

  const isFormData = options.body instanceof FormData;
  if (!isFormData) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${cleanUrl}`, {
    ...options,
    headers: { ...defaultHeaders, ...options.headers },
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      handleLogout();
    }
    throw new Error('UNAUTHORIZED');
  }

  if (response.status === 403) {
    if (typeof window !== 'undefined') {
      handleForbidden();
    }
    throw new Error('FORBIDDEN');
  }

  return response;
}

export function handleLogout() {
  Cookies.remove('token');
  // 使用 window.location 强制跳转，确保清理所有内存状态（如 Context/Zustand）
  window.location.href = '/login';
}

function handleForbidden() {
  window.location.href = '/chat';
}
