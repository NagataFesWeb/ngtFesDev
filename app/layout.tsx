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
  title: "NgtFes26 | 文化祭",
  description: "長田高校文化祭2026 公式Webアプリ",
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
