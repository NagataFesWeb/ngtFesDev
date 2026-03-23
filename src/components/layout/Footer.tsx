import Link from 'next/link'

export const Footer = () => {
    return (
        <footer className="border-t bg-footer-background">
            <div className="container mx-auto px-4 flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
                <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
                    <p className="text-center text-sm leading-loose text-footer-foreground md:text-left">
                        Built for NgtFes26.
                    </p>
                </div>
                <div className="flex gap-4">
                    <Link href="/operator/login" className="text-xs text-footer-foreground hover:underline">
                        運営者ログイン
                    </Link>
                    <Link href="/admin/login" className="text-xs text-footer-foreground hover:underline">
                        管理者ログイン
                    </Link>
                </div>
            </div>
        </footer>
    )
}
