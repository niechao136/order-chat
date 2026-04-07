import Cookies from 'js-cookie';


export async function apiRequest(url: string, options: RequestInit = {}) {
  const token = Cookies.get('token') ?? '';

  const defaultHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    ...options,
    headers: { ...defaultHeaders, ...options.headers },
  });

  if (response.status === 401) {
    handleLogout();
    throw new Error('会话已过期，请重新登录');
  }

  if (response.status === 403) {
    handleForbidden();
    throw new Error('会话已过期，请重新登录');
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
