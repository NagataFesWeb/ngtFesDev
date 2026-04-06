/** 枠の終了時刻（end_time）を過ぎたら発券・表示上は失効（グレースなし） */
export type FestivalDay = 'school' | 'public'

export function festivalDayLabel(day: FestivalDay): string {
    return day === 'school' ? '校内祭（5/8）' : '一般祭（5/9）'
}

export function slotEndTimeMs(endTimeIso: string): number {
    return new Date(endTimeIso).getTime()
}

/** 発券不可: 枠の end_time を過ぎている */
export function isFastpassSlotIssuanceClosed(endTimeIso: string, nowMs = Date.now()): boolean {
    return nowMs > slotEndTimeMs(endTimeIso)
}

/** マイページ: チケットがまだ「有効枠」として扱うか（end_time まで） */
export function isFastpassTicketStillValid(endTimeIso: string, nowMs = Date.now()): boolean {
    return nowMs <= slotEndTimeMs(endTimeIso)
}
