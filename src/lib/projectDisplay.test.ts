import { describe, it, expect } from 'vitest'
import type { Database } from '@/types/database.types'
import {
    getProjectTypeLabel,
    getProjectTypeBadgeClassName,
    normalizeEscapedNewlines,
    getNormalizedProjectSchedule
} from './projectDisplay'

type ProjectRow = Database['public']['Tables']['projects']['Row']

describe('projectDisplay utilities', () => {
    describe('getProjectTypeLabel', () => {
        it('should correctly classify stage types based on location', () => {
            expect(getProjectTypeLabel('stage', '講堂大ホール')).toBe('講堂ステージ')
            expect(getProjectTypeLabel('stage', '野外特設ステージ')).toBe('野外ステージ')
            expect(getProjectTypeLabel('stage', '中庭')).toBe('ステージ')
        })

        it('should return correct labels for standard project types', () => {
            expect(getProjectTypeLabel('food', null)).toBe('食品模擬')
            expect(getProjectTypeLabel('class', null)).toBe('教室模擬')
            expect(getProjectTypeLabel('exhibition', null)).toBe('展示')
            expect(getProjectTypeLabel('unknown', null)).toBe('その他')
        })
    })

    describe('getProjectTypeBadgeClassName', () => {
        it('should return correct CSS classes for each badge label', () => {
            expect(getProjectTypeBadgeClassName('class', null)).toContain('sky-100')
            expect(getProjectTypeBadgeClassName('food', null)).toContain('amber-100')
            expect(getProjectTypeBadgeClassName('exhibition', null)).toContain('emerald-100')
            expect(getProjectTypeBadgeClassName('stage', '野外ステージ')).toContain('violet-100')
            expect(getProjectTypeBadgeClassName('stage', '講堂')).toContain('rose-100')
            expect(getProjectTypeBadgeClassName('unknown', null)).toContain('bg-muted')
        })
    })

    describe('normalizeEscapedNewlines', () => {
        it('should convert escaped newlines to real newlines', () => {
            expect(normalizeEscapedNewlines('Hello\\nWorld')).toBe('Hello\nWorld')
            expect(normalizeEscapedNewlines(null)).toBeNull()
            expect(normalizeEscapedNewlines(undefined)).toBeUndefined()
        })
    })

    describe('getNormalizedProjectSchedule', () => {
        it('should return normalized schedule string from project object', () => {
            const mockProject = { schedule: '10:00-11:00\\n12:00-13:00' } as Partial<ProjectRow> as ProjectRow
            expect(getNormalizedProjectSchedule(mockProject)).toBe('10:00-11:00\n12:00-13:00')
        })

        it('should return empty string when schedule is null', () => {
            const mockProject = { schedule: null } as Partial<ProjectRow> as ProjectRow
            expect(getNormalizedProjectSchedule(mockProject)).toBe('')
        })
    })
})
