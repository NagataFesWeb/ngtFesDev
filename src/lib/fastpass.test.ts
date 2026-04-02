import { describe, it, expect } from 'vitest'
import {
    slotEndTimeMs,
    isFastpassSlotIssuanceClosed,
    isFastpassTicketStillValid,
    festivalDayLabel,
} from './fastpass'

describe('fastpass', () => {
    it('slotEndTimeMs matches end instant', () => {
        const iso = '2026-05-08T12:00:00.000Z'
        expect(slotEndTimeMs(iso)).toBe(new Date(iso).getTime())
    })

    it('isFastpassSlotIssuanceClosed at end boundary', () => {
        const end = '2026-04-02T08:00:00.000Z'
        const tEnd = slotEndTimeMs(end)
        expect(isFastpassSlotIssuanceClosed(end, tEnd)).toBe(false)
        expect(isFastpassSlotIssuanceClosed(end, tEnd + 1)).toBe(true)
    })

    it('isFastpassTicketStillValid mirrors issuance closed', () => {
        const end = '2026-04-02T08:00:00.000Z'
        const tEnd = slotEndTimeMs(end)
        expect(isFastpassTicketStillValid(end, tEnd)).toBe(true)
        expect(isFastpassTicketStillValid(end, tEnd + 1)).toBe(false)
    })

    it('festivalDayLabel', () => {
        expect(festivalDayLabel('school')).toContain('校内祭')
        expect(festivalDayLabel('public')).toContain('一般祭')
    })
})
