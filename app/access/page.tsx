import Image from "next/image";
import ngtmap from "./ngtmap.png";


export default function Access(){
    return(
        <div className="flex flex-col">
            {/* アクセス */}
            <section className="w-full py-8">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="mb-8">
                        <h1 className="font-bold text-3xl">Access</h1>
                        <h2 className="text-xl text-muted-foreground">アクセス</h2>
                    </div>
                    
                    <div className="flex justify-center items-center text-center mb-8">    
                        <h3 className="border-b-2 text-2xl pb-2 w-full max-w-[1100px]">アクセス方法</h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 items-center justify-items-center py-4">
                        <figure className="max-w-[500px] w-full">
                            <Image className="w-full h-auto rounded-lg shadow-md" src={ngtmap} alt="長田高校のアクセスマップ" />
                        </figure>
                        <div className="w-full max-w-[500px]">
                            <ul className="text-lg space-y-4">
                                <li className="flex items-start">
                                    <span className="mr-2 mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                                    <span>阪神、山陽電鉄で高速長田駅下車（阪急は新開地駅で乗りかえ）徒歩15分</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2 mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                                    <span>市営地下鉄長田駅下車徒歩15分</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2 mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                                    <span>JR兵庫駅で市バス（④系統）に乗り、長田神社前で下車、徒歩5分</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2 mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                                    <span>JR兵庫駅で下車、タクシーで約10分</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex justify-center items-center text-center mt-12 mb-8"> 
                        <h3 className="text-2xl border-b-2 pb-2 w-full max-w-[1100px]">Googleマップで見る</h3>
                    </div>
                    <div className="flex justify-center">
                        <figure className="w-full max-w-[1000px]">
                            <iframe 
                                className="w-full aspect-video rounded-lg shadow-md" 
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d6562.791832018688!2d135.14150147451699!3d34.669955884863974!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6000858f683ffc87%3A0x9f05c21ab04e7f09!2z5YW15bqr55yM56uL6ZW355Sw6auY562J5a2m5qCh!5e0!3m2!1sja!2sjp!4v1772976033214!5m2!1sja!2sjp"  
                                style={{border:0}} 
                                loading="lazy"
                            ></iframe>
                        </figure>
                    </div>
                </div>
            </section>

            {/* 注意事項 */}
            <section className="bg-muted/50 w-full py-12">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="mb-8">
                        <h1 className="font-bold text-3xl">Caution</h1>
                        <h2 className="text-xl text-muted-foreground">注意事項</h2>
                    </div>
                    <div className="flex justify-center">
                        <div className="w-full max-w-[800px] bg-background p-6 md:p-8 rounded-xl shadow-sm border">
                            <ul className="text-left text-lg space-y-4">
                                <li className="flex items-start">
                                    <span className="mr-2 mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                                    <span>ここに注意を記入</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2 mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                                    <span>etc..</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}