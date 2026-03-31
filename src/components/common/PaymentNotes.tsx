import { CreditCard } from 'lucide-react';

export function PaymentNotes() {
    return (
        <section className="w-full py-12">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mb-8">
                    <h2 className="font-bold text-3xl">Payment</h2>
                    <p className="text-xl text-muted-foreground">お支払い</p>
                </div>
                <div className="flex justify-center">
                    <div className="w-full max-w-[800px] bg-muted/30 p-6 md:p-8 rounded-xl shadow-sm border border-border/50">
                        <ul className="text-left text-base md:text-lg space-y-6">
                            <li className="flex items-start">
                                <CreditCard className="mr-3 mt-1 h-5 w-5 text-primary shrink-0" />
                                <span className="leading-relaxed">
                                    １階会議室のau PAYブースにてau PAYの説明および、金券の販売をしております。
                                </span>
                            </li>
                            <li className="flex items-start">
                                <CreditCard className="mr-3 mt-1 h-5 w-5 text-primary shrink-0" />
                                <span className="leading-relaxed">
                                    金券は20円×10枚の200円単位で購入可能です。
                                </span>
                            </li>
                            <li className="flex items-start">
                                <CreditCard className="mr-3 mt-1 h-5 w-5 text-primary shrink-0" />
                                <span className="leading-relaxed">
                                    au PAYの残高がなくなった場合にはチャージカードの購入が可能です。
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
