// app/page.tsx
import { redirect } from 'next/navigation'

export default function RootPage() {
  // 兜底逻辑
  redirect('/login')
}
