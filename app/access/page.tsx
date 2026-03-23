import Image from "./ngtmap.png";


export default function Access(){
    return(
        <>
            {/* アクセス */}
            <section className="mt-6 w-full">
                <div className="mx-5">
                    <div >
                        <h1 className="font-bold text-3xl px-4">Access</h1>
                        <h2 className="text-1xl px-4">アクセス</h2>
                    </div>
                    <div className="flex justify-center items-center text-center ">    
                        <h3 className="border-b-2  text-2xl pb-2 w-full max-w-[1100px]">アクセス方法</h3>
                    </div>
                    <div className="block md:flex py-4 px-2 items-center justify-center">
                    
                        <figure className=" flex-1 max-w-[500px] map  justify-end">
                            <img className=" h-atuo" src={Image.src} alt="長田高校のアクセスマップ" />
                        </figure>
                        <figcaption className="max-w-[500px]  flex-1 mapcap px-4 justify-center items-center flex">
                            <ul className="text-[20px] px-4 py-4">
                                <li className="py-2 list-disc">阪神、山陽電鉄で高速長田駅下車（阪急は新開地駅で乗りかえ）徒歩15分</li>

                                <li className="py-2 list-disc">市営地下鉄長田駅下車徒歩15分</li>
                                <li className="py-2 list-disc">JR兵庫駅で市バス（④系統）に乗り、長田神社前で下車、徒歩5分</li>
                                <li className="py-2 list-disc">JR兵庫駅で下車、タクシーで約10分</li>
                                    
                            </ul>
                        </figcaption>
                    </div>
                    <div className="flex justify-center items-center text-center "> 
                        <h3 className=" text-2xl border-b-2 pb-2 w-full max-w-[1100px]">Googleマップで見る</h3>
                    </div>
                    <div className="flex py-4 justify-center">
                        
                        <figure className="w-full max-w-[1000px]">
                            <iframe className="aspect-video" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d6562.791832018688!2d135.14150147451699!3d34.669955884863974!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6000858f683ffc87%3A0x9f05c21ab04e7f09!2z5YW15bqr55yM56uL6ZW355Sw6auY562J5a2m5qCh!5e0!3m2!1sja!2sjp!4v1772976033214!5m2!1sja!2sjp"  style={{border:0}} loading="lazy"></iframe>
                            <figcaption></figcaption>
                        </figure>
                    </div>
                </div>
            </section>

            {/* 注意事項 */}
            <section className="bg-muted/50 w-full py-6">
                <div className="mx-5">
                    <div>
                        <h1 className="font-bold text-3xl px-4">Caution</h1>
                        <h2 className="text-1xl px-4">注意事項</h2>
                    </div>
                    <div className="flex justify-center">
                        <div className="w-full max-w-[800px] mx-8">
                            <ul className="text-left text-[20px] py-4">
                                <li className="list-disc list-inside">
                                    ここに注意を記入
                                </li>
                                <li className="list-disc list-inside">
                                    etc..
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}