'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Trash2, AlertTriangle, Users, Settings, RefreshCcw, Ticket, ChevronRight, ArrowLeft, Search } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'
import { NewsManager } from '@/components/admin/NewsManager'

import { Switch } from '@/components/ui/switch'

// Slot Editor Component (Controlled Input)
function SlotCapacityEditor({ slot, onUpdate }: { slot: any, onUpdate: (id: string, val: number) => void }) {
    const [value, setValue] = useState(slot.capacity.toString())
    const [isEditing, setIsEditing] = useState(false)

    // Sync with prop updates
    useEffect(() => {
        setValue(slot.capacity.toString())
    }, [slot.capacity])

    const handleBlur = () => {
        setIsEditing(false)
        const numVal = parseInt(value)
        if (!isNaN(numVal) && numVal !== slot.capacity) {
            if (numVal < slot.issued_count) {
                toast.error('発行済み数未満には設定できません')
                setValue(slot.capacity.toString()) // Revert
                return
            }
            onUpdate(slot.slot_id, numVal)
        } else {
            setValue(slot.capacity.toString()) // Revert if invalid or unchanged
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.currentTarget as HTMLInputElement).blur()
        }
    }

    return (
        <div className="flex items-center space-x-2">
            <Input
                type="number"
                className="w-24 h-8"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onFocus={() => setIsEditing(true)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
            {isEditing && <span className="text-xs text-muted-foreground animate-pulse">Enterで確定</span>}
            {!isEditing && slot.capacity !== parseInt(value) && <LoadingSpinner className="h-3 w-3" />}
        </div>
    )
}

export default function AdminDashboard() {
    const [loadingStats, setLoadingStats] = useState(false)

    // Congestion Stats
    const [projects, setProjects] = useState<any[]>([])
    const [loadingProjects, setLoadingProjects] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // FastPass Stats
    const [fpProjects, setFpProjects] = useState<any[]>([])
    const [loadingFpProjects, setLoadingFpProjects] = useState(false)
    const [selectedFpProject, setSelectedFpProject] = useState<any | null>(null)
    const [slots, setSlots] = useState<any[]>([])
    const [loadingSlots, setLoadingSlots] = useState(false)

    // System Settings
    const [settings, setSettings] = useState<any[]>([])
    const [loadingSettings, setLoadingSettings] = useState(false)

    // Reset Dialog
    const [resetConfirmation, setResetConfirmation] = useState('')
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
    const [resetting, setResetting] = useState(false)

    // --- Data Fetching ---


    const fetchProjects = async () => {
        setLoadingProjects(true)
        const { data, error } = await supabase.rpc('admin_get_projects_status')
        if (error) toast.error('企画一覧取得失敗: ' + error.message)
        else setProjects(data as any)
        setLoadingProjects(false)
    }

    const fetchFpProjects = async () => {
        setLoadingFpProjects(true)
        const { data, error } = await supabase.rpc('admin_get_fastpass_projects')
        if (error) toast.error('FP企画一覧取得失敗: ' + error.message)
        else setFpProjects(data as any)
        setLoadingFpProjects(false)
    }

    const fetchSlots = async (projectId: string) => {
        setLoadingSlots(true)
        const { data, error } = await supabase.rpc('admin_get_project_slots', { p_project_id: projectId } as any)
        if (error) toast.error('スロット取得失敗: ' + error.message)
        else setSlots(data as any)
        setLoadingSlots(false)
    }

    const fetchSettings = async () => {
        setLoadingSettings(true)
        const { data, error } = await supabase.from('system_settings').select('*').order('key')
        if (error) toast.error('設定取得失敗: ' + error.message)
        else setSettings(data || [])
        setLoadingSettings(false)
    }

    useEffect(() => {
        fetchProjects()
        fetchFpProjects()
        fetchSettings()
    }, [])

    // Filter Logic
    const filteredProjects = projects.filter(project =>
        (project.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.class_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    // --- Actions ---

    // Congestion
    const handleCongestionUpdate = async (projectId: string, newLevel: number) => {
        const { error } = await supabase.rpc('admin_update_congestion', {
            p_project_id: projectId,
            p_level: newLevel
        } as any)
        if (error) toast.error('混雑状況更新失敗: ' + error.message)
        else {
            toast.success('更新しました')
            fetchProjects()
        }
    }

    // FastPass Project Toggle
    const handleFpToggle = async (projectId: string, enabled: boolean) => {
        const { error } = await supabase.rpc('admin_toggle_project_fastpass', {
            p_project_id: projectId,
            p_enabled: enabled
        } as any)
        if (error) toast.error('FP設定更新失敗: ' + error.message)
        else {
            toast.success('更新しました')
            fetchFpProjects()
        }
    }

    // FastPass Slot Capacity Update
    const handleCapacityUpdate = async (slotId: string, newCapacity: number) => {
        const { error } = await supabase.rpc('admin_update_slot_capacity', {
            p_slot_id: slotId,
            p_capacity: newCapacity
        } as any)
        if (error) toast.error('枠数更新失敗: ' + error.message)
        else {
            toast.success('更新しました')
            if (selectedFpProject) fetchSlots(selectedFpProject.project_id)
        }
    }

    // System Settings
    const handleSettingUpdate = async (key: string, newValue: boolean) => {
        // Optimistic update
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s))
        const { error } = await supabase.rpc('admin_update_setting', {
            p_key: key,
            p_value: newValue
        } as any)
        if (error) {
            toast.error('設定更新失敗: ' + error.message)
            fetchSettings()
        } else {
            toast.success('設定を変更しました')
        }
    }

    // Data Reset
    const handleReset = async (target: string) => {
        if (resetConfirmation !== 'RESET 2026') {
            toast.error('確認コードが正しくありません')
            return
        }
        setResetting(true)
        try {
            const { error } = await supabase.rpc('admin_reset_all_data', {
                p_target_table: target,
                p_confirmation: 'RESET 2026'
            } as any)
            if (error) throw error
            toast.success('データをリセットしました')
            setIsResetDialogOpen(false)
            fetchProjects()
            fetchFpProjects()
        } catch (err: any) {
            toast.error('リセット失敗: ' + err.message)
        } finally {
            setResetting(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">システム管理</h1>
                <Button variant="outline" size="icon" onClick={() => { fetchProjects(); fetchFpProjects(); fetchSettings(); }}>
                    <RefreshCcw className="h-4 w-4" />
                </Button>
            </div>

            <Tabs defaultValue="news" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-5 h-auto">
                    <TabsTrigger value="news">お知らせ</TabsTrigger>
                    <TabsTrigger value="congestion">混雑管理</TabsTrigger>
                    <TabsTrigger value="fastpass">整理券(FP)</TabsTrigger>
                    <TabsTrigger value="settings">システム設定</TabsTrigger>
                    <TabsTrigger value="danger" className="text-red-500">危険</TabsTrigger>
                </TabsList>


                {/* --- NEWS TAB --- */}
                <TabsContent value="news" className="space-y-4" defaultValue="news">
                    <NewsManager />
                </TabsContent>

                {/* --- CONGESTION TAB --- */}
                <TabsContent value="congestion" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center"><Users className="mr-2" /> 混雑状況一括管理</CardTitle>
                            <CardDescription>
                                各企画の混雑状況を変更します。<br />
                                <span className="text-xs text-muted-foreground">
                                    目安: 空き(20%未満), やや混(20-80%), 混雑(80%以上)
                                </span>
                            </CardDescription>
                            <div className="mt-4 relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="企画名またはクラスで検索..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingProjects ? <LoadingSpinner /> : (
                                <div className="rounded-md border max-h-[600px] overflow-auto">
                                    <table className="w-full text-sm text-left relative">
                                        <thead className="bg-muted text-muted-foreground sticky top-0 z-10">
                                            <tr>
                                                <th className="p-3 font-medium">クラス</th>
                                                <th className="p-3 font-medium">企画名</th>
                                                <th className="p-3 font-medium">現在の状況</th>
                                                <th className="p-3 font-medium">変更</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredProjects.map((project) => (
                                                <tr key={project.project_id} className="border-t hover:bg-muted/50">
                                                    <td className="p-3 font-mono">{project.class_name}</td>
                                                    <td className="p-3 font-medium">{project.title}</td>
                                                    <td className="p-3">
                                                        <span className={cn(
                                                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                                            project.congestion_level === 1 ? "bg-blue-100 text-blue-800" :
                                                                project.congestion_level === 2 ? "bg-yellow-100 text-yellow-800" :
                                                                    "bg-red-100 text-red-800"
                                                        )}>
                                                            {project.congestion_level === 1 ? '空いている' :
                                                                project.congestion_level === 2 ? 'やや混雑' : '混雑'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <select
                                                            className="flex h-9 w-28 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                                            value={project.congestion_level}
                                                            onChange={(e) => handleCongestionUpdate(project.project_id, parseInt(e.target.value))}
                                                        >
                                                            <option value={1}>空き</option>
                                                            <option value={2}>やや混</option>
                                                            <option value={3}>混雑</option>
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- FASTPASS TAB --- */}
                <TabsContent value="fastpass" className="space-y-4">
                    {!selectedFpProject ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center"><Ticket className="mr-2" /> 整理券(ファストパス)管理</CardTitle>
                                <CardDescription>各企画のFP利用有無と発行枚数を管理します。</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loadingFpProjects ? <LoadingSpinner /> : (
                                    <div className="rounded-md border max-h-[600px] overflow-auto">
                                        <table className="w-full text-sm text-left relative">
                                            <thead className="bg-muted text-muted-foreground sticky top-0 z-10">
                                                <tr>
                                                    <th className="p-3 font-medium">クラス</th>
                                                    <th className="p-3 font-medium">企画名</th>
                                                    <th className="p-3 font-medium">利用</th>
                                                    <th className="p-3 font-medium">枠数/発券済</th>
                                                    <th className="p-3 font-medium">詳細</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {fpProjects.map((project) => (
                                                    <tr key={project.project_id} className="border-t hover:bg-muted/50">
                                                        <td className="p-3 font-mono">{project.class_name}</td>
                                                        <td className="p-3 font-medium">{project.title}</td>
                                                        <td className="p-3">
                                                            <Switch
                                                                checked={project.fastpass_enabled}
                                                                onCheckedChange={(c) => handleFpToggle(project.project_id, c)}
                                                            />
                                                        </td>
                                                        <td className="p-3 text-muted-foreground">
                                                            {project.total_slots} 枠 / {project.total_issued} 枚
                                                        </td>
                                                        <td className="p-3">
                                                            <Button size="sm" variant="ghost" onClick={() => { setSelectedFpProject(project); fetchSlots(project.project_id); }}>
                                                                設定 <ChevronRight className="ml-1 h-4 w-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => setSelectedFpProject(null)}>
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                    <div>
                                        <CardTitle>{selectedFpProject.class_name} {selectedFpProject.title}</CardTitle>
                                        <CardDescription>時間枠ごとの発行可能数を設定します。</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loadingSlots ? <LoadingSpinner /> : (
                                    <div className="space-y-4">
                                        {slots.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">時間枠が設定されていません</div>
                                        ) : (
                                            <div className="rounded-md border">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-muted text-muted-foreground">
                                                        <tr>
                                                            <th className="p-3 font-medium">開始 - 終了</th>
                                                            <th className="p-3 font-medium">発行済</th>
                                                            <th className="p-3 font-medium">上限数 (Capacity)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {slots.map((slot) => (
                                                            <tr key={slot.slot_id} className="border-t">
                                                                <td className="p-3 font-mono">
                                                                    {new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                                    {new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </td>
                                                                <td className="p-3">{slot.issued_count} 枚</td>
                                                                <td className="p-3">
                                                                    <SlotCapacityEditor slot={slot} onUpdate={handleCapacityUpdate} />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* --- SETTINGS TAB --- */}
                <TabsContent value="settings" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center"><Settings className="mr-2" /> 機能制御 (Feature Toggles)</CardTitle>
                            <CardDescription>文化祭全体の機能の有効/無効を切り替えます。</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingSettings ? <LoadingSpinner /> : (
                                <div className="space-y-6">
                                    {settings.map((setting) => (
                                        <div key={setting.key} className="flex items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <div className="font-medium">
                                                    {setting.key === 'voting_enabled' ? '投票機能' :
                                                        setting.key === 'quiz_enabled' ? 'クイズ機能' :
                                                            setting.key === 'fastpass_enabled' ? '整理券発券' :
                                                                setting.key === 'operator_edit_enabled' ? '運営者情報編集' : setting.key}
                                                </div>
                                                <div className="text-sm text-muted-foreground">{setting.description}</div>
                                            </div>
                                            <Switch
                                                checked={!!setting.value}
                                                onCheckedChange={(c) => handleSettingUpdate(setting.key, c)}
                                            />
                                        </div>
                                    ))}
                                    {settings.length === 0 && <div className="text-muted-foreground">設定が見つかりません</div>}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- DANGER TAB --- */}
                <TabsContent value="danger" className="space-y-4">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>危険な領域</AlertTitle>
                        <AlertDescription>以下の操作は取り消せません。慎重に操作してください。</AlertDescription>
                    </Alert>

                    <Card className="border-red-200 dark:border-red-900/30">
                        <CardHeader>
                            <CardTitle>データリセット</CardTitle>
                            <CardDescription>テストデータを消去する場合などに使用します。</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> システムデータをリセット
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>本当にリセットしますか？</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <p className="text-sm text-muted-foreground">
                                            整理券データ、ゲストユーザーなどを削除します。<br />
                                            <strong>マスターデータ（企画、クラス、管理者）は削除されません。</strong>
                                        </p>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">確認コードを入力: <span className="font-mono bg-muted px-1">RESET 2026</span></label>
                                            <Input
                                                value={resetConfirmation}
                                                onChange={(e) => setResetConfirmation(e.target.value)}
                                                placeholder="RESET 2026"
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>キャンセル</Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => handleReset('all')}
                                            disabled={resetting || resetConfirmation !== 'RESET 2026'}
                                        >
                                            {resetting && <LoadingSpinner className="mr-2" />}
                                            完全リセット実行
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
