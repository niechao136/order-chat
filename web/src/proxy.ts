// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // 1. 获取 Cookie 中的 token
  const token = request.cookies.get('token')?.value

  // 2. 获取当前访问的路径
  const { pathname } = request.nextUrl

  // 3. 定义逻辑：如果访问的是根路径 "/"
  if (pathname === '/') {
    if (token) {
      // 已登录，去聊天页
      return NextResponse.redirect(new URL('/chat', request.url))
    } else {
      // 未登录，去登录页
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // 4. 定义逻辑：保护 /chat 和 /admin 路径
  if (pathname.startsWith('/chat') || pathname.startsWith('/admin')) {
    if (!token) {
      // 没登录却想进后台，强制踢回登录页
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

// 匹配器：设置哪些路径需要经过此中间件（提升性能）
export const config = {
  matcher: [
    '/',
    '/chat/:path*',
    '/admin/:path*',
    '/login',
    '/register',
  ],
}
