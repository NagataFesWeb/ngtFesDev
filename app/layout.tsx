import type { Metadata } from "next";
import { Inter, Limelight } from "next/font/google"; // Using Inter for better looking
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });
const limelight = Limelight({ 
  weight: "400",
  subsets: ["latin"],
  variable: "--font-limelight", 
});

export const metadata: Metadata = {
  title: "第79回 長田高校文化祭2026「SOLA」 HP",
  description: "長田高校文化祭2026 HPへようこそ！模擬店情報、ステージイベント、アクセス方法など、文化祭の全てを網羅。最新情報をお届けします。",
  // ここにGoogleの確認コードを追加します
  verification: {
    google: "4oOH8zU95W7h4bcVytdDtoTF0pPBEDOQpkILrk7Obw8",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={cn(inter.className,  limelight.variable)} suppressHydrationWarning>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
