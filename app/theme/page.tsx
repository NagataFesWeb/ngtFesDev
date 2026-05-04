import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "テーマ紹介 | 長田高校文化祭2026 SOLA",
  description: "長田高校文化祭2026「SOLA」のテーマ・サブテーマをご紹介します。",
};

export default function ThemePage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[1000px] h-[600px] md:h-[1000px] rounded-full bg-[var(--hero-first-background)] opacity-[0.25] blur-[100px] md:blur-[150px] z-0 pointer-events-none dark:opacity-[0.15]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[700px] h-[400px] md:h-[700px] rounded-full bg-[var(--hero-third-background)] opacity-[0.35] blur-[80px] md:blur-[120px] z-0 pointer-events-none dark:opacity-[0.25]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] md:w-[400px] h-[200px] md:h-[400px] rounded-full bg-[var(--hero-second-background)] opacity-[0.45] blur-[60px] md:blur-[80px] z-0 pointer-events-none dark:opacity-[0.35]" />

      <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl relative z-10">
        <h1 className="text-center text-3xl md:text-5xl font-bold tracking-widest mb-20 md:mb-32 text-foreground/90">
          長田高校文化祭2026<br className="md:hidden" />
          <span className="hidden md:inline"> </span>
          テーマ・サブテーマ紹介
        </h1>

        <div className="space-y-28 md:space-y-40">
          {/* Greeting */}
          <section className="flex flex-col items-center text-center space-y-10">
            <div className="space-y-6">
              <p className="text-2xl md:text-3xl font-serif text-muted-foreground tracking-widest">Greeting</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-widest text-foreground py-4 drop-shadow-sm">
                ご挨拶
              </h2>
            </div>

            <div className="max-w-2xl space-y-8 mt-8">
              <p className="text-lg md:text-xl leading-[2.5] md:leading-[2.5] text-foreground/90 font-medium">
                長田生が描く「自由」を体現した模擬店、そして迫力満点のステージの数々。<br />
                高揚した空気の中で育まれる友情、そして愛。<br />
                この二日間、この場にいるすべての人が小難しい課題や英単語を忘れ、<br />
                今しかないこの瞬間を、誰よりも欲張りに楽しみ尽くせるひとときに。<br />
                そして、文武遊楽、すべてを兼ね備えた長田生のエネルギーで、<br />
                この空を、私たちの個性あふれる色彩で塗り替え、最高の一瞬を刻みましょう。
              </p>
              <p className="text-lg md:text-xl text-muted-foreground text-right pr-4 pt-4">
                第79回文化祭実行委員長　中西 基
              </p>
            </div>
            
            <div className="pt-12 md:pt-16">
              <Image src="/1772606843056.jpg" alt="文化祭ロゴ" width={300} height={300} className="w-48 md:w-64 h-auto drop-shadow-lg mx-auto rounded-full object-cover aspect-square" />
            </div>
          </section>

          {/* Main Theme */}
          <section className="flex flex-col items-center text-center space-y-10">
            <div className="space-y-4">
              <p className="text-2xl md:text-3xl font-serif text-muted-foreground tracking-widest">Theme</p>
              <h2 className="text-[5rem] md:text-[8rem] lg:text-[12rem] leading-none limelight tracking-widest text-foreground drop-shadow-sm">
                SOLA
              </h2>
            </div>
            
            <div className="max-w-2xl space-y-8 mt-8">
              <p className="text-xl md:text-2xl leading-[2.5] md:leading-[2.5] text-foreground/90 font-medium">
                ラテン語で「唯一の」という意味を持ち、<br />
                日本語の空と同音であるこのテーマ<br />
                には長田にしかできない唯一の、<br />
                そして長田生の限りない可能性を秘めた<br />
                そんな文化祭になって欲しいという<br />
                願いを込めています。
              </p>
              <p className="text-lg md:text-xl text-muted-foreground text-right pr-4 pt-4">
                テーマ考案者　3年 定岡咲楽
              </p>
            </div>
          </section>

          {/* Sub Theme */}
          <section className="flex flex-col items-center text-center space-y-10">
             <div className="space-y-6">
              <p className="text-2xl md:text-3xl font-serif text-muted-foreground tracking-widest">Subtheme</p>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-widest text-foreground py-4 drop-shadow-sm">
                この空、長田色
              </h2>
            </div>

            <div className="max-w-2xl space-y-8 mt-8">
              <p className="text-xl md:text-2xl leading-[2.5] md:leading-[2.5] text-foreground/90 font-medium">
                この空が唯一無二であるように、<br />
                長田生一人ひとりが特別な存在だ<br />
                という思いを込めました。普段は意識<br />
                しない個性やつながりを大切にし、<br />
                その色を重ねて、長田ならではの景色をつくる<br />
                文化祭にしたいです。
              </p>
              <p className="text-lg md:text-xl text-muted-foreground text-right pr-4 pt-4">
                サブテーマ考案者　2年 榊原かなで
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
