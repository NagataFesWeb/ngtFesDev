'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
type SettingRow = { key: string; value: unknown }

function parseOpensAt(value: unknown): string {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    return ''
}

/** datetime-local 用 (ブラウザのローカル表示) */
function toDatetimeLocalValue(iso: string): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** datetime-local の値を +09:00 付き ISO に（入力時刻を JST として保存） */
function fromDatetimeLocalToIso(local: string): string | null {
    if (!local.trim()) return null
    const [datePart, timePart] = local.split('T')
    if (!datePart || !timePart) return null
    return `${datePart}T${timePart}:00+09:00`
}

export function FastpassSaleSettings() {
    const [loading, setLoading] = useState(true)
    const [schoolToggle, setSchoolToggle] = useState(false)
    const [publicToggle, setPublicToggle] = useState(false)
    const [schoolOpensLocal, setSchoolOpensLocal] = useState('')
    const [publicOpensLocal, setPublicOpensLocal] = useState('')

    const load = async () => {
        setLoading(true)
        const { data, error } = await supabase.from('system_settings').select('key, value').in('key', [
            'fastpass_sale_school_toggle',
            'fastpass_sale_school_opens_at',
            'fastpass_sale_public_toggle',
            'fastpass_sale_public_opens_at',
        ])
        if (error) {
            toast.error('販売設定の取得に失敗: ' + error.message)
            setLoading(false)
            return
        }
        const map = new Map((data as SettingRow[]).map((r) => [r.key, r.value]))
        setSchoolToggle(map.get('fastpass_sale_school_toggle') === true || map.get('fastpass_sale_school_toggle') === 'true')
        setPublicToggle(map.get('fastpass_sale_public_toggle') === true || map.get('fastpass_sale_public_toggle') === 'true')
        setSchoolOpensLocal(toDatetimeLocalValue(parseOpensAt(map.get('fastpass_sale_school_opens_at') ?? null)))
        setPublicOpensLocal(toDatetimeLocalValue(parseOpensAt(map.get('fastpass_sale_public_opens_at') ?? null)))
        setLoading(false)
    }

    useEffect(() => {
        const t = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(t)
    }, [])

    const saveToggle = async (key: string, checked: boolean) => {
        const { error } = await supabase.rpc('admin_update_setting', {
            p_key: key,
            p_value: checked,
        })
        if (error) {
            toast.error('更新失敗: ' + error.message)
            await load()
            return
        }
        toast.success('保存しました')
        await load()
    }

    /** 日時未設定に戻す（DB の JSON null）。誤設定をすぐ取り消す用途。 */
    const clearOpensAtSchedule = async (key: 'fastpass_sale_school_opens_at' | 'fastpass_sale_public_opens_at', label: string) => {
        const { error } = await supabase.rpc('admin_update_setting', {
            p_key: key,
            p_value: null,
        })
        if (error) {
            toast.error('取り消しに失敗: ' + error.message)
            await load()
            return
        }
        toast.success(`${label}の販売開始「日時予定」を取り消しました`)
        await load()
    }

    const saveOpensAt = async (key: 'fastpass_sale_school_opens_at' | 'fastpass_sale_public_opens_at', local: string) => {
        const iso = fromDatetimeLocalToIso(local)
        const { error } = await supabase.rpc('admin_update_setting', {
            p_key: key,
            p_value: iso === null ? null : iso,
        })
        if (error) {
            toast.error('更新失敗: ' + error.message)
            await load()
            return
        }
        toast.success('販売開始日時を保存しました')
        await load()
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="py-8 flex justify-center">
                    <LoadingSpinner />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>ファストパス販売開始</CardTitle>
                <CardDescription>
                    校内祭・一般祭それぞれ、トグルで即時オープン、または開始日時（この日時以降に自動オープン）を設定できます。どちらか一方で満たせば販売中になります。
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <p className="text-sm text-muted-foreground leading-relaxed rounded-md border bg-muted/40 px-3 py-2">
                    <strong className="text-foreground">日時を間違えたとき:</strong>
                    「開始予定を取り消す」または「日時をクリア」で、保存済みの開始日時をいつでも未設定に戻せます（開始時刻を過ぎていても取り消し可能です）。
                    ただし<strong className="text-foreground">即時販売トグルが ON のままだと販売は続きます</strong>。販売を止める場合はトグルも OFF にしてください。
                </p>

                <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-semibold">校内祭（5月8日）</h3>
                    <div className="flex items-center justify-between gap-4">
                        <Label htmlFor="fp-school-toggle" className="flex-1 cursor-pointer">
                            販売を即時オープン（トグル）
                        </Label>
                        <Switch
                            id="fp-school-toggle"
                            checked={schoolToggle}
                            onCheckedChange={async (c) => {
                                setSchoolToggle(c)
                                await saveToggle('fastpass_sale_school_toggle', c)
                            }}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fp-school-at">販売開始日時（未設定で無効）</Label>
                        <div className="flex flex-wrap items-center gap-2">
                            <Input
                                id="fp-school-at"
                                type="datetime-local"
                                value={schoolOpensLocal}
                                onChange={(e) => setSchoolOpensLocal(e.target.value)}
                                className="max-w-xs"
                            />
                            <Button type="button" size="sm" onClick={() => saveOpensAt('fastpass_sale_school_opens_at', schoolOpensLocal)}>
                                日時を保存
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => clearOpensAtSchedule('fastpass_sale_school_opens_at', '校内祭')}
                            >
                                開始予定を取り消す
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                    setSchoolOpensLocal('')
                                    await clearOpensAtSchedule('fastpass_sale_school_opens_at', '校内祭')
                                }}
                            >
                                日時をクリア
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">入力した時刻を日本時間（表示どおり）として保存します。</p>
                    </div>
                </div>

                <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-semibold">一般祭（5月9日）</h3>
                    <div className="flex items-center justify-between gap-4">
                        <Label htmlFor="fp-public-toggle" className="flex-1 cursor-pointer">
                            販売を即時オープン（トグル）
                        </Label>
                        <Switch
                            id="fp-public-toggle"
                            checked={publicToggle}
                            onCheckedChange={async (c) => {
                                setPublicToggle(c)
                                await saveToggle('fastpass_sale_public_toggle', c)
                            }}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fp-public-at">販売開始日時（未設定で無効）</Label>
                        <div className="flex flex-wrap items-center gap-2">
                            <Input
                                id="fp-public-at"
                                type="datetime-local"
                                value={publicOpensLocal}
                                onChange={(e) => setPublicOpensLocal(e.target.value)}
                                className="max-w-xs"
                            />
                            <Button type="button" size="sm" onClick={() => saveOpensAt('fastpass_sale_public_opens_at', publicOpensLocal)}>
                                日時を保存
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => clearOpensAtSchedule('fastpass_sale_public_opens_at', '一般祭')}
                            >
                                開始予定を取り消す
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                    setPublicOpensLocal('')
                                    await clearOpensAtSchedule('fastpass_sale_public_opens_at', '一般祭')
                                }}
                            >
                                日時をクリア
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
