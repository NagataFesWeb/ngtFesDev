import type { Metadata } from "next";
import { Inter, Limelight, DotGothic16 } from "next/font/google"; // Using Inter for better looking
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });
const limelight = Limelight({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-limelight",
});
const dotGothic = DotGothic16({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dotgothic",
});

const SITE_NAME = "第79回 長田高校文化祭2026「SOLA」 特設HP";

export const metadata: Metadata = {
  title: {
    template: `%s | ${SITE_NAME}`,
    default: SITE_NAME,
  },
  description: "長田高校文化祭2026 HPへようこそ！模擬店情報、ステージイベント、アクセス方法など、文化祭の全てを網羅。最新情報をお届けします。",
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
      <body className={cn(inter.className, limelight.variable, dotGothic.variable)} suppressHydrationWarning>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
