import type { Metadata } from 'next'
import QuizSyncProvider from './QuizSyncProvider'

export const metadata: Metadata = {
  title: '長田検定',
}

export default function QuizLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
    <QuizSyncProvider>
      {children}
    </QuizSyncProvider>
    </>
  )
}
