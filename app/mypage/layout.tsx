import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'マイページ',
}

export default function MyPageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
