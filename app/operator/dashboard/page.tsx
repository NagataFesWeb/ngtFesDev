'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOperator } from '@/contexts/OperatorContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { QRScanner } from '@/components/operator/QRScanner'
import { StatusIcon } from '@/components/common/StatusIcon'
import { toast } from 'sonner'
import { useRef } from 'react'
import { Users, Ticket, CheckCircle2, XCircle, Edit, Upload, ImageIcon } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function OperatorDashboard() {
    const { operatorToken, className, projectId, loading: authLoading } = useOperator()
    const router = useRouter()

    const [currentCongestion, setCurrentCongestion] = useState<number>(1)
    const [loading, setLoading] = useState(true)
    const [processingTicket, setProcessingTicket] = useState(false)
    const [scanResult, setScanResult] = useState<{ status: string, message?: string, project?: string } | null>(null)

    useEffect(() => {
        if (!authLoading && !operatorToken) {
            router.push('/operator/login')
        }
    }, [operatorToken, authLoading, router])

    useEffect(() => {
        // Need to fetch current project status.
        // But we don't know project_id from operatorToken directly unless we fetch it.
        // operator_login returned class_name, but mostly we need project_id.
        // Let's rely on `operator_update_congestion` to return error if not linked.
        // For display, we prob need an RPC `get_operator_project_status`.
        // For MVP, just default to 1 and let update set it.
        // OR, we can try to fetch from public.congestion by joining with classes? No RLS might block.
        // Let's just implement update for now.
        setLoading(false)
    }, [])

    const handleUpdateCongestion = async (level: number) => {
        try {
            // Optimistic UI
            const oldLevel = currentCongestion
            setCurrentCongestion(level)

            const { data, error } = await supabase.rpc('operator_update_congestion', {
                p_operator_token: operatorToken,
                p_level: level
            } as any)

            if (error) throw error

            const res = data as any
            if (res.status !== 'updated') {
                throw new Error(res.message || 'Error updating')
            }
            toast.success('混雑状況を更新しました')
        } catch (err: any) {
            toast.error('更に失敗しました: ' + err.message)
            // Revert?
        }
    }

    const handleScan = async (qrToken: string) => {
        setProcessingTicket(true)
        setScanResult(null)
        try {
            const { data, error } = await supabase.rpc('verify_and_use_ticket', {
                p_qr_token: qrToken,
                p_operator_token: operatorToken
            } as any)

            if (error) throw error

            const res = data as any
            if (res.status === 'ok') {
                setScanResult({ status: 'success', project: res.project_title })
                toast.success('チケットを確認しました！')
            } else {
                let msg = res.message
                if (res.code === 'ALREADY_USED') msg = '既に使用済みのチケットです'
                setScanResult({ status: 'error', message: msg })
                toast.error('エラー: ' + msg)
            }

        } catch (err: any) {
            setScanResult({ status: 'error', message: err.message })
            toast.error('エラー: ' + err.message)
        } finally {
            setProcessingTicket(false)
        }
    }

    if (authLoading || loading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>
    if (!operatorToken) return null

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold mb-6">運営者ダッシュボード ({className})</h1>

            <Tabs defaultValue="status" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="status">混雑・受付</TabsTrigger>
                    <TabsTrigger value="edit">情報編集</TabsTrigger>
                    <TabsTrigger value="preview">プレビュー</TabsTrigger>
                </TabsList>

                <TabsContent value="status" className="space-y-6 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Users className="mr-2 h-5 w-5" /> 混雑状況の更新
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 text-sm text-muted-foreground">
                                <p className="mb-2">現在の混雑状況を選択してください。来場者ページにリアルタイムで反映されます。</p>
                                <ul className="list-disc list-inside text-xs space-y-1 bg-muted p-2 rounded-md">
                                    <li><strong>空いている (LVL1)</strong>: 収容人数の20%未満</li>
                                    <li><strong>普通 (LVL2)</strong>: 収容人数の20%〜80%</li>
                                    <li><strong>混雑 (LVL3)</strong>: 収容人数の80%以上</li>
                                </ul>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {[1, 2, 3].map((level) => (
                                    <Button
                                        key={level}
                                        variant={currentCongestion === level ? "default" : "outline"}
                                        className={`h-24 flex flex-col items-center justify-center gap-2 ${currentCongestion === level ? 'ring-2 ring-offset-2' : ''}`}
                                        onClick={() => handleUpdateCongestion(level)}
                                    >
                                        <StatusIcon level={level} className="w-8 h-8" />
                                        <span>{level === 1 ? '空いている' : level === 2 ? '普通' : '混雑'}</span>
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Ticket className="mr-2 h-5 w-5" /> チケット読み取り
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <QRScanner onScan={handleScan} onError={(err) => console.log(err)} />

                            {processingTicket && <div className="text-center py-4"><LoadingSpinner /> 処理中...</div>}

                            {scanResult && (
                                <div className={`p-4 rounded-lg flex items-center gap-4 ${scanResult.status === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                    {scanResult.status === 'success' ? (
                                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                                    ) : (
                                        <XCircle className="w-8 h-8 text-red-600" />
                                    )}
                                    <div>
                                        <h4 className="font-bold text-lg">
                                            {scanResult.status === 'success' ? '確認OK' : 'エラー'}
                                        </h4>
                                        <p className="text-sm">
                                            {scanResult.status === 'success'
                                                ? `${scanResult.project} の整理券を使用しました`
                                                : scanResult.message
                                            }
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="edit" className="mt-4">
                    <EditProjectCard operatorToken={operatorToken!} projectId={projectId} />
                </TabsContent>

                <TabsContent value="preview" className="mt-4">
                    <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground">
                            Coming Soon... (企画詳細ページで確認してください)
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function EditProjectCard({ operatorToken, projectId }: { operatorToken: string, projectId: string | null }) {
    const [description, setDescription] = useState('')
    const [imageUrl, setImageUrl] = useState('')
    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Initial fetch
    useEffect(() => {
        if (!projectId) return
        const fetchProject = async () => {
            const { data } = await supabase
                .from('projects')
                .select('description, image_url')
                .eq('project_id', projectId)
                .single()
            if (data) {
                // @ts-ignore
                setDescription(data.description || '')
                // @ts-ignore
                setImageUrl(data.image_url || '')
            }
        }
        fetchProject()
    }, [projectId])

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        setUploading(true)
        try {
            const file = e.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('project-images')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data } = supabase.storage.from('project-images').getPublicUrl(filePath)
            setImageUrl(data.publicUrl)
            toast.success('画像をアップロードしました')
        } catch (error: any) {
            toast.error('アップロードエラー: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const { data, error } = await supabase.rpc('operator_update_project', {
                p_operator_token: operatorToken,
                p_description: description,
                p_image_url: imageUrl
            } as any)

            if (error) throw error
            const res = data as any
            if (res.status !== 'success') throw new Error(res.message)

            toast.success('保存しました')
        } catch (error: any) {
            toast.error('保存エラー: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Edit className="mr-2 h-5 w-5" /> 企画情報の編集
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>模擬店・企画の説明文</Label>
                    <Textarea
                        placeholder="企画の魅力を伝えましょう..."
                        value={description}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                        rows={5}
                    />
                </div>

                <div className="space-y-2">
                    <Label>イメージ画像</Label>
                    <div className="flex items-start gap-4">
                        <div className="border-2 border-dashed rounded-lg p-4 w-32 h-32 flex items-center justify-center bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
                            {imageUrl ? (
                                <img src={imageUrl} alt="Project" className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            )}
                        </div>
                        <div className="space-y-2">
                            <Input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                disabled={uploading}
                            />
                            <p className="text-xs text-muted-foreground">
                                ※推奨サイズ: 16:9 (1200x675px)<br />
                                {uploading && <span className="text-primary font-bold">アップロード中...</span>}
                            </p>
                        </div>
                    </div>
                </div>

                <Button className="w-full" onClick={handleSave} disabled={saving || uploading}>
                    {saving ? '保存中...' : '変更を保存'}
                </Button>
            </CardContent>
        </Card>
    )
}
