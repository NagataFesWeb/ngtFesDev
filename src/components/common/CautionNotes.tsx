import { AlertCircle } from 'lucide-react';

export function CautionNotes() {
    return (
        <section className="w-full py-12">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mb-8">
                    <h2 className="font-bold text-3xl">Caution</h2>
                    <p className="text-xl text-muted-foreground">注意事項</p>
                </div>
                <div className="flex justify-center">
                    <div className="w-full max-w-[800px] bg-muted/30 p-6 md:p-8 rounded-xl shadow-sm border border-border/50">
                        <ul className="text-left text-base md:text-lg space-y-6">
                            <li className="flex items-start">
                                <AlertCircle className="mr-3 mt-1 h-5 w-5 text-destructive shrink-0" />
                                <span className="leading-relaxed">
                                    今年度の文化祭は在校生による招待制となります。<br />
                                    招待チケットをお持ちでない方は入場いただけません。<br />
                                    <span className="font-medium text-destructive">OB・OGの方についても、同様にご遠慮いただいております。</span>
                                </span>
                            </li>
                            <li className="flex items-start">
                                <AlertCircle className="mr-3 mt-1 h-5 w-5 text-primary shrink-0" />
                                <span className="leading-relaxed">
                                    中学生の方は生徒手帳、申し込み完了画面 (印刷も可能)をお持ちください。
                                </span>
                            </li>
                            <li className="flex items-start">
                                <AlertCircle className="mr-3 mt-1 h-5 w-5 text-primary shrink-0" />
                                <span className="leading-relaxed">
                                    ステージは原則撮影禁止です。
                                </span>
                            </li>
                            <li className="flex items-start">
                                <AlertCircle className="mr-3 mt-1 h-5 w-5 text-primary shrink-0" />
                                <span className="leading-relaxed">
                                    講堂ステージは混雑時、入場制限をする場合がございます。
                                </span>
                            </li>
                            <li className="flex items-start">
                                <AlertCircle className="mr-3 mt-1 h-5 w-5 text-primary shrink-0" />
                                <span className="leading-relaxed">
                                    雨天時、野外ステージはピロティにて行います。<br />
                                    その際、<span className="font-medium text-destructive">傘の使用は禁止</span>です。カッパ等をお使いください。
                                </span>
                            </li>
                            <li className="flex items-start">
                                <AlertCircle className="mr-3 mt-1 h-5 w-5 text-primary shrink-0" />
                                <span className="leading-relaxed">
                                    校舎内の食品模擬店で購入された食品は指定された場所で食べて下さい。<br />
                                    <span className="font-medium text-destructive">校舎内での食べ歩きは禁止</span>しております。
                                </span>
                            </li>
                            <li className="flex items-start">
                                <AlertCircle className="mr-3 mt-1 h-5 w-5 text-primary shrink-0" />
                                <span className="leading-relaxed">
                                    飲食は、食品模擬待機列、教室模擬飲食許可スペース、イートインスペースのみ可能となっております。<br />
                                    <span className="font-medium text-destructive">食べ歩きはご遠慮ください。</span>
                                </span>
                            </li>
                            <li className="flex items-start">
                                <AlertCircle className="mr-3 mt-1 h-5 w-5 text-primary shrink-0" />
                                <span className="leading-relaxed">
                                    写真や動画のSNSへのアップロードはおやめください。
                                </span>
                            </li>
                            <li className="flex items-start">
                                <AlertCircle className="mr-3 mt-1 h-5 w-5 text-primary shrink-0" />
                                <span className="leading-relaxed">
                                    落とし物は野外ステージ横の本部までお願いします。
                                </span>
                            </li>
                            <li className="flex items-start">
                                <AlertCircle className="mr-3 mt-1 h-5 w-5 text-primary shrink-0" />
                                <span className="leading-relaxed">
                                    食堂はau PAYの使用はできません。<span className="font-medium text-destructive">現金、金券のみ使用可能</span>です。
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
