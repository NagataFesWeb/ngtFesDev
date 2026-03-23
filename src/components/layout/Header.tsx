"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSession } from "@/contexts/SessionContext";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const NavLinks = () => (
  <>
    <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
      トップ
    </Link>
    <Link href="/projects" className="text-sm font-medium transition-colors hover:text-primary">
      企画一覧
    </Link>
    <Link href="/quiz" className="text-sm font-medium transition-colors hover:text-primary">
      長田検定
    </Link>
    <Link href="/mypage" className="text-sm font-medium transition-colors hover:text-primary">
      マイページ
    </Link>
    <Link href="/access" className="text-sm font-medium transition-colors hover:text-primary">
      アクセス
    </Link>
  </>
);

const MobileNavLinks = () => (
  <>
    <Link href="/" className="block py-2 text-base font-medium transition-colors hover:text-primary">
      トップ
    </Link>
    <Link href="/projects" className="block py-2 text-base font-medium transition-colors hover:text-primary">
      企画一覧
    </Link>
    <Link href="/quiz" className="block py-2 text-base font-medium transition-colors hover:text-primary">
      長田検定
    </Link>
    <Link href="/mypage" className="block py-2 text-base font-medium transition-colors hover:text-primary">
      マイページ
    </Link>
    <Link href="/access" className="block py-2 text-base font-medium transition-colors hover:text-primary">
      アクセス
    </Link>
  </>
);

export const Header = () => {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 md:px-8">
        {/* PC用ロゴ & メニュー */}
        <div className="flex items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-lg">NgtFes26</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <NavLinks />
          </nav>
        </div>

        {/* スマホ用ボタンエリア（ログイン＋三本線） */}
        <div className="flex items-center space-x-3 md:hidden">
          <AuthButton />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[45%] min-w-[200px] p-0">
              <SheetTitle className="sr-only">メニュー</SheetTitle>
              <nav className="flex flex-col space-y-5 mt-16 p-8">
                <MobileNavLinks />
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* PC用右側エリア（ログインボタンのみ） */}
        <div className="hidden md:flex items-center space-x-2">
          <AuthButton />
        </div>
      </div>
    </header>
  );
};

interface UserProfile {
  display_name: string | null;
}

const AuthButton = () => {
  const { session, loading } = useSession();
  const [nickname, setNickname] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadNickname = async () => {
      if (!session?.user) {
        if (active) setNickname(null);
        return;
      }

      const { data } = await supabase
        .from("users")
        .select("display_name")
        .eq("user_id", session.user.id)
        .single<UserProfile>();

      if (!active) return;
      setNickname(data?.display_name ?? null);
    };

    loadNickname();

    return () => {
      active = false;
    };
  }, [session?.user]);

  if (loading)
    return (
      <Button variant="ghost" size="sm" disabled>
        ...
      </Button>
    );

  if (!session) {
    return (
      <Button asChild variant="default" size="sm">
        <Link href="/login">ログイン</Link>
      </Button>
    );
  }

  return (
    <Button asChild variant="outline" size="sm">
      <Link href="/mypage">{nickname || "マイページ"}</Link>
    </Button>
  );
};