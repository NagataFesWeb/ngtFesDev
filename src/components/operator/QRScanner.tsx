'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2 } from 'lucide-react'
import '@/components/operator/scanner.css'

type QRScannerProps = {
    onScan: (data: string) => void
    onError: (error: string) => void
}

export const QRScanner = ({ onScan, onError }: QRScannerProps) => {
    const [isActive, setIsActive] = useState(false)
    const [mountError, setMountError] = useState<string | null>(null)
    const [starting, setStarting] = useState(false)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const scannerDivId = "reader"

    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                try {
                    if (scannerRef.current.isScanning) {
                        scannerRef.current.stop()
                            .then(() => {
                                try { scannerRef.current?.clear() } catch (e) { console.warn(e) }
                            })
                            .catch(err => {
                                console.warn("Stop failed", err)
                                try { scannerRef.current?.clear() } catch (e) { console.warn(e) }
                            })
                    } else {
                        // Only clear if not scanning (or stopped)
                        try { scannerRef.current.clear() } catch (e) { console.warn(e) }
                    }
                } catch (e) {
                    console.warn("Error during scanner cleanup", e)
                }
            }
        }
    }, [])

    const startScanner = async () => {
        setMountError(null)
        setStarting(true)

        try {
            // 1. Check browser support
            if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("カメラへのアクセスがサポートされていない環境です。HTTPSを使用してください。")
            }

            // 2. Explicit permission request (helps on iOS 18+ sometimes)
            await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })

            setIsActive(true)

            // 3. Initialize Html5Qrcode (Direct API)
            // Wait a tick for the div to render
            setTimeout(async () => {
                try {
                    const html5QrCode = new Html5Qrcode(scannerDivId)
                    scannerRef.current = html5QrCode

                    const config = {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                    }

                    // Prefer back camera
                    await html5QrCode.start(
                        { facingMode: "environment" },
                        config,
                        (decodedText) => {
                            console.log("QR Code detected:", decodedText)
                            stopScanner()
                            onScan(decodedText)
                        },
                        (errorMessage) => {
                            // ignore frame errors
                        }
                    )
                    setStarting(false)

                } catch (err: any) {
                    console.error("Failed to start scanner instance", err)
                    let msg = "スキャナーの起動に失敗しました。"
                    if (typeof err === 'string') msg = err
                    else if (err.message) msg = err.message

                    setMountError(msg)
                    onError(msg)
                    setIsActive(false)
                    setStarting(false)
                }
            }, 100)

        } catch (err: any) {
            console.error("Camera permission/setup error:", err)
            let msg = "カメラの起動エラー: " + (err.message || "不明なエラー")

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                msg = "カメラのアクセスが拒否されました。"
            }

            setMountError(msg)
            onError(msg)
            setStarting(false)
        }
    }

    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.stop()
                .then(() => {
                    return scannerRef.current?.clear()
                })
                .catch(console.error)
                .finally(() => {
                    setIsActive(false)
                    setStarting(false)
                })
        } else {
            setIsActive(false)
            setStarting(false)
        }
    }

    return (
        <div className="w-full space-y-4">
            {mountError && (
                <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-md flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{mountError}</span>
                </div>
            )}

            {!isActive ? (
                <Button onClick={startScanner} className="w-full h-12 text-lg" disabled={starting}>
                    {starting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : '📸'}
                    {starting ? 'カメラ起動中...' : 'QRコードをスキャン'}
                </Button>
            ) : (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="relative w-full overflow-hidden rounded-lg bg-black min-h-[300px]">
                        <div id={scannerDivId} className="w-full h-full"></div>
                        {starting && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                                <Loader2 className="w-8 h-8 animate-spin" />
                            </div>
                        )}
                    </div>

                    <Button variant="secondary" onClick={stopScanner} className="w-full">
                        キャンセル
                    </Button>
                </div>
            )}
        </div>
    )
}
