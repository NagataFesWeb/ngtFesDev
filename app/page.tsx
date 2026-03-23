import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, MapPin, Star, User } from 'lucide-react'
import { NewsList } from '@/components/common/NewsList'
import { CautionNotes } from '@/components/common/CautionNotes'

export default function Home() {
  console.log('Rendering Home Page on Server');
  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center py-12 md:py-24 lg:py-32 bg-gradient-to-br from-hero-first-background via-hero-second-background to-hero-third-background" >
        <div className="container mx-auto px-4 md:px-6 flex flex-col items-center text-center space-y-4">
          <div className='md:flex'>
            <div className='md:w-2/3 w-full'>  
              <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none pt-4">
                    第79回　長田高校文化祭
                  </h1>
                  <h2 className="mx-auto max-w-[700px]  text-8xl limelight">
                    SOLA
                  </h2>
                  <h2 className="mx-auto max-w-[700px] text-4xl">
                    この空、長田色
                  </h2>
              
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400 py-4 mt-12">
                  長田高校文化祭 公式Webアプリ
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/projects">
                  <Button size="lg" className="h-12 px-8">
                    企画を探す <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className='w-full md:w-1/3 py-4 max-w-[400px]'>
              <div>
                <figure>
                  <img src="1772606843056.jpg" alt="" className='w-full' />
                </figure>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Grid */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-6 md:grid-cols-3 lg:gap-12">
            <Link href="/projects" className="group">
              <Card className="h-full transition-colors group-hover:bg-muted/50">
                <CardHeader>
                  <MapPin className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>企画一覧・マップ</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    クラス企画、模擬店、ステージなどの全企画をチェック。リアルタイムな混雑状況も確認できます。
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/quiz" className="group">
              <Card className="h-full transition-colors group-hover:bg-muted/50">
                <CardHeader>
                  <Star className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>長田検定</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    長田高校に関するクイズに挑戦！ハイスコアを目指してランクインしよう。
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/mypage" className="group">
              <Card className="h-full transition-colors group-hover:bg-muted/50">
                <CardHeader>
                  <User className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>マイページ</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    取得したファストパスの確認や、プロフィールの設定はこちらから。
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
    </div>
  )
}
