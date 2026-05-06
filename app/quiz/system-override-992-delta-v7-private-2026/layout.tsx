export default function SecretLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        /* 親レイアウトのヘッダーとフッターを強制的に隠す */
        header, footer, .flex.min-h-screen.flex-col > header, .flex.min-h-screen.flex-col > footer {
          display: none !important;
        }
        /* メインコンテンツのパディングなどを解除 */
        main {
          padding: 0 !important;
          margin: 0 !important;
        }
      `}} />
      {children}
    </div>
  )
}
