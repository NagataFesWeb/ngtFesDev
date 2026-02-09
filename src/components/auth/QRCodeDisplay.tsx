'use client'

import { QRCodeSVG } from 'qrcode.react'

export const QRCodeDisplay = ({ value, size = 128 }: { value: string; size?: number }) => {
    return (
        <div className="bg-white p-2 rounded-lg inline-block">
            <QRCodeSVG value={value} size={size} level={'H'} />
        </div>
    )
}
