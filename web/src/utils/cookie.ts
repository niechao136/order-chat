import Cookies from 'js-cookie';


export const TOKEN_COOKIE = 'token';


export function setCookie(key: string, value: string, option: Cookies.CookieAttributes = {}) {
  Cookies.set(key, value, option);
}

export function getCookie(key: string) {
  return Cookies.get(key);
}

export function removeCookie(key: string, option: Cookies.CookieAttributes = {}) {
  Cookies.remove(key, option);
}
