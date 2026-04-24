import Cookies from 'js-cookie';

export function setCookie(key: string, value: string, option: Cookies.CookieAttributes = {}) {
  Cookies.set(key, value, option);
}

export function getCookie(key: string) {
  return Cookies.get(key);
}

export function removeCookie(key: string, option: Cookies.CookieAttributes = {}) {
  Cookies.remove(key, option);
}


const TOKEN_COOKIE = 'token';


export function saveToken(token: string) {
  setCookie(TOKEN_COOKIE, token, { expires: 1, path: '/' });
}

export function clearToken() {
  removeCookie(TOKEN_COOKIE);
}

export async function getToken() {

  if (typeof window === 'undefined') {
    // 服务端环境
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    return cookieStore.get(TOKEN_COOKIE)?.value ?? '';
  }

  // 客户端环境
  return getCookie(TOKEN_COOKIE) ?? '';
}
