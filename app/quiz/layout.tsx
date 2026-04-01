import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '長田検定',
}

export default function QuizLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
