'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SecretPage() {
    const router = useRouter()
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
    const [loading, setLoading] = useState(true)
    const [windows, setWindows] = useState<{ id: number, x: number, y: number }[]>([])
    const [audioStarted, setAudioStarted] = useState(false)
    const [okClickCount, setOkClickCount] = useState(0)
    // 最初は画面中央付近に配置するための初期値
    const [okPos, setOkPos] = useState<{ x: string | number, y: string | number }>({ x: '50%', y: '60%' })
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        const checkAuthorization = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (!session) {
                    router.push('/login?redirect=/quiz/system-override-992-delta-v7-private-2026')
                    return
                }
                const { data: reward } = await supabase.from('quiz_rewards').select('required_score').eq('id', 6).single()
                const requiredScore = (reward as any)?.required_score || 0
                const { data: scoreData } = await supabase.from('quiz_scores').select('total_score').eq('user_id', session.user.id).single()
                if (scoreData && (scoreData as any).total_score >= requiredScore) {
                    setIsAuthorized(true)
                } else {
                    setIsAuthorized(false)
                }
            } catch (err) {
                setIsAuthorized(false)
            } finally {
                setLoading(false)
            }
        }
        checkAuthorization()
    }, [router])

    // 音声の再生制御と全画面表示
    const handleStart = () => {
        setAudioStarted(true)
        const docElm = document.documentElement;
        if (docElm.requestFullscreen) {
            docElm.requestFullscreen().catch(() => {});
        } else if ((docElm as any).webkitRequestFullscreen) {
            (docElm as any).webkitRequestFullscreen();
        }

        if (audioRef.current) {
            audioRef.current.play().catch(e => {
                if (e.name !== 'AbortError') console.error("Audio play failed:", e)
            })
        }
    }

    // ウィンドウ増殖アニメーション
    useEffect(() => {
        if (isAuthorized && audioStarted) {
            let count = 0
            const maxWindows = 100
            const spawnWindow = () => {
                if (count < maxWindows) {
                    const isBurst = Math.random() > 0.7
                    const burstSize = isBurst ? Math.floor(Math.random() * 4) + 2 : 1
                    const newWindows: { id: number, x: number, y: number }[] = []
                    const baseStartX = Math.random() * (window.innerWidth - 300)
                    const baseStartY = Math.random() * (window.innerHeight - 200)

                    for (let i = 0; i < burstSize; i++) {
                        if (count + i >= maxWindows) break
                        newWindows.push({
                            id: Date.now() + Math.random() + i,
                            x: (baseStartX + (i * 30)) % (window.innerWidth - 300),
                            y: (baseStartY + (i * 30)) % (window.innerHeight - 200)
                        })
                    }
                    setWindows(prev => [...prev, ...newWindows])
                    count += newWindows.length
                    if (count >= maxWindows) {
                        setTimeout(() => setWindows([]), 5000)
                    } else {
                        const delay = isBurst ? Math.random() * 200 + 30 : Math.random() * 350 + 50
                        setTimeout(spawnWindow, delay)
                    }
                }
            }
            // 5秒間の猶予を与えてから増殖開始
            const timer = setTimeout(() => {
                spawnWindow()
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [isAuthorized, audioStarted])

    const removeWindow = (id: number) => {
        setWindows(prev => prev.filter(win => win.id !== id))
    }

    const handleOkClick = () => {
        setOkClickCount(prev => prev + 1)
        // 画面内の安全な範囲（端から100px以内には行かない）でランダムに配置
        const x = 100 + Math.random() * (window.innerWidth - 300)
        const y = 100 + Math.random() * (window.innerHeight - 200)
        setOkPos({ x, y })
    }

    if (loading) return null

    if (isAuthorized === false) {
        return (
            <div style={{ backgroundColor: 'black', color: 'white', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'serif' }}>
                <h1>403 Forbidden</h1>
            </div>
        )
    }

    return (
        <div style={{
            backgroundColor: 'white',
            color: 'black',
            margin: 0,
            padding: 0,
            height: '100vh',
            width: '100vw',
            overflow: 'hidden',
            fontFamily: '"Times New Roman", Times, serif',
            position: 'relative'
        }}>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes flash {
                    0%, 49% { background-color: white; color: black; }
                    50%, 100% { background-color: black; color: white; }
                }
                .idiot-container {
                    animation: flash 1s steps(1) infinite;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    position: absolute;
                    inset: 0;
                }
                .idiot-text {
                    font-size: 80px;
                    font-weight: bold;
                    margin: 10px 0;
                    line-height: 1;
                }
                .idiot-subtext {
                    font-size: 120px;
                    margin: 10px 0;
                }
                .idiot-ha {
                    font-size: 40px;
                }
                @media (max-width: 640px) {
                    .idiot-text {
                        font-size: 32px;
                    }
                    .idiot-subtext {
                        font-size: 60px;
                    }
                    .idiot-ha {
                        font-size: 20px;
                    }
                }
                .fake-window {
                    position: absolute;
                    width: 300px;
                    height: 200px;
                    border: 2px solid #000;
                    background-color: #dfdfdf;
                    box-shadow: 2px 2px 0 #fff inset, -2px -2px 0 #808080 inset;
                    z-index: 100;
                    display: flex;
                    flex-direction: column;
                }
                .window-title {
                    background: linear-gradient(90deg, #000080, #1084d0);
                    color: white;
                    padding: 2px 5px;
                    font-size: 12px;
                    font-weight: bold;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .window-content {
                    flex: 1;
                    padding: 10px;
                    color: black;
                    background-color: white;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    font-size: 14px;
                }
            `}} />
            
            <div className="idiot-container" style={{ zIndex: 10 }}>
                <div className="idiot-text">You are an idiot!</div>
                <div className="idiot-subtext">☺ ☺ ☺</div>
                <div className="idiot-text idiot-ha">ha ha ha ha ha ha ha</div>
            </div>

            {/* OKボタンをコンテナから分離して配置 */}
            <div style={{ 
                position: 'fixed',
                left: okPos.x,
                top: okPos.y,
                transform: okPos.x === '50%' ? 'translate(-50%, -50%)' : `scale(${Math.max(0.1, 1 - okClickCount * 0.1)})`,
                zIndex: 50, // 偽ウィンドウ(100)より下に配置
                transition: 'all 0.1s ease-out'
            }}>
                <button 
                    onClick={handleOkClick}
                    style={{
                        padding: '10px 30px',
                        fontSize: '18px',
                        cursor: 'pointer',
                        border: '2px solid #000',
                        backgroundColor: '#ccc',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                    }}
                >
                    [ OK ]
                </button>
            </div>

            {/* 真の戻るボタン */}
            {audioStarted && (
                <button 
                    onClick={() => router.push('/quiz')}
                    style={{
                        position: 'fixed',
                        top: '60px',
                        left: '10px',
                        zIndex: 2000,
                        background: 'transparent',
                        border: '1px solid #ccc',
                        color: '#666',
                        fontSize: '10px',
                        padding: '2px 5px',
                        cursor: 'pointer',
                        opacity: 0.5,
                        fontFamily: 'sans-serif'
                    }}
                >
                    Back to quiz
                </button>
            )}

            {/* ウィンドウ増殖 */}
            {windows.map(win => (
                <div key={win.id} className="fake-window" style={{ left: win.x, top: win.y }}>
                    <div className="window-title">
                        <span>Information</span>
                        <span onClick={() => removeWindow(win.id)} style={{ background: '#ccc', color: '#000', width: '14px', height: '14px', textAlign: 'center', lineHeight: '12px', fontSize: '10px', border: '1px solid #000', cursor: 'pointer', userSelect: 'none' }}>x</span>
                    </div>
                    <div className="window-content">
                        <div style={{ fontSize: '30px', marginBottom: '5px' }}>☺</div>
                        <div>You are an idiot!</div>
                    </div>
                </div>
            ))}

            <audio ref={audioRef} src="/you-are-an-idiot.mp3" loop preload="auto" />

            {!audioStarted && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'serif' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div onClick={handleStart} style={{ fontSize: '24px', color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}>Click here!</div>
                    </div>
                </div>
            )}
        </div>
    )
}
