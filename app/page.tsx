import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Star, User, Store, Palette, Music } from 'lucide-react'
import { NewsList } from '@/components/common/NewsList'
import { CautionNotes } from '@/components/common/CautionNotes'
import { PaymentNotes } from '@/components/common/PaymentNotes'

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center py-12 md:py-24 lg:py-32 bg-gradient-to-br from-hero-first-background via-hero-second-background to-hero-third-background" >
        <div className="container mx-auto px-4 md:px-6 flex flex-col items-center text-center space-y-4">
          <div className='md:flex md:items-center md:gap-12'>
            <div className='md:w-2/3 w-full'>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none pt-4 whitespace-nowrap">
                  第79回 長田高校文化祭
                </h1>
                <h2 className="mx-auto max-w-[700px] text-8xl limelight whitespace-nowrap">
                  SOLA
                </h2>
                <h2 className="mx-auto max-w-[700px] text-4xl whitespace-nowrap">
                  この空、長田色
                </h2>
              </div>
              <div className="pt-8 md:pt-12 space-y-2 text-left md:text-center max-w-xl mx-auto md:mx-0">
                <p className="text-base md:text-lg text-foreground/90 font-medium leading-relaxed">
                  校内祭：2026.5.8（金）9:30〜15:00
                </p>
                <p className="text-base md:text-lg text-foreground/90 font-medium leading-relaxed">
                  一般祭：2026.5.9（土）9:00〜15:00
                </p>
              </div>
            </div>
            <div className='w-full md:w-1/3 py-4 max-w-[400px]'>
              <div>
                <figure>
                  <Image src="/1772606843056.jpg" alt="長田高校文化祭" width={400} height={400} className='w-full' />
                </figure>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Grid */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            <Link href="/booth" className="group">
              <Card className="h-full transition-all duration-300 group-hover:bg-muted/50 group-hover:shadow-md border-primary/10">
                <CardHeader className="p-4">
                  <Store className="h-8 w-8 mb-2 text-primary group-hover:scale-110 transition-transform" />
                  <CardTitle className="text-lg">模擬店</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm md:text-base text-muted-foreground">
                    教室模擬、食品模擬の全店舗をチェック。
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/display" className="group">
              <Card className="h-full transition-all duration-300 group-hover:bg-muted/50 group-hover:shadow-md border-primary/10">
                <CardHeader className="p-4">
                  <Palette className="h-8 w-8 mb-2 text-primary group-hover:scale-110 transition-transform" />
                  <CardTitle className="text-lg">文化部展示</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm md:text-base text-muted-foreground">
                    文化部の展示をチェック。
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/stage" className="group">
              <Card className="h-full transition-all duration-300 group-hover:bg-muted/50 group-hover:shadow-md border-primary/10">
                <CardHeader className="p-4">
                  <Music className="h-8 w-8 mb-2 text-primary group-hover:scale-110 transition-transform" />
                  <CardTitle className="text-lg">ステージ</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm md:text-base text-muted-foreground">
                    野外・講堂での熱いパフォーマンス。
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/quiz" className="group">
              <Card className="h-full transition-all duration-300 group-hover:bg-muted/50 group-hover:shadow-md border-primary/10">
                <CardHeader className="p-4">
                  <Star className="h-8 w-8 mb-2 text-primary group-hover:scale-110 transition-transform" />
                  <CardTitle className="text-lg">長田検定</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm md:text-base text-muted-foreground">
                    長田高校のクイズに挑戦！ハイスコアを狙おう。
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/mypage" className="group">
              <Card className="h-full transition-all duration-300 group-hover:bg-muted/50 group-hover:shadow-md border-primary/10">
                <CardHeader className="p-4">
                  <User className="h-8 w-8 mb-2 text-primary group-hover:scale-110 transition-transform" />
                  <CardTitle className="text-lg">マイページ</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm md:text-base text-muted-foreground">
                    パスの確認やプロフィールの設定。
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="w-full py-12 bg-muted">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl font-bold tracking-tighter mb-4 flex items-center">
            📢 お知らせ
          </h2>
          <NewsList />
        </div>
      </section>

      {/* Caution Section */}
      <CautionNotes />
      <PaymentNotes />
    </div>
  )
}
