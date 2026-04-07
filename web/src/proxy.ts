// src/proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // 1. 获取 Cookie 中的 token
  const token = request.cookies.get('token')?.value

  // 2. 获取当前访问的路径
  const { pathname } = request.nextUrl

  const publicPaths = ['/login', '/register']
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

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

  // 4. 动态路由保护
  if (!isPublicPath && !token) {
    // 排除掉图片、字体等静态资源
    const isStaticResource = pathname.includes('.') || pathname.startsWith('/_next')
    if (!isStaticResource) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

// 匹配器：设置哪些路径需要经过此中间件（提升性能）
export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * 1. /api (API 路由)
     * 2. /_next/static (静态文件)
     * 3. /_next/image (图片优化)
     * 4. /favicon.ico (浏览器图标)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
