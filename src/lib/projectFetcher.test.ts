import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getProjectListGranular } from './projectFetcher'

describe('projectFetcher utilities', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co'
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-key'
    })

    it('should correctly merge projects and status when fetch succeeds', async () => {
        const mockProjects = [
            { project_id: 'p1', class_id: '1-1', type: 'class', title: 'Project 1', description: 'Desc 1', image_url: '', location: 'Room 1', schedule: '10:00', fastpass_enabled: true }
        ]
        const mockStatusList = [
            { project_id: 'p1', congestion_level: 2, wait_time_min: 15 }
        ]
        const mockFpSetting = [{ value: true }]
        const mockCongestionData = [{ project_id: 'p1', updated_at: '2026-08-01T00:00:00Z' }]

        global.fetch = vi.fn().mockImplementation((url: string) => {
            if (url.includes('/rest/v1/projects')) {
                return Promise.resolve({ json: () => Promise.resolve(mockProjects) })
            }
            if (url.includes('/rest/v1/rpc/get_projects_with_status')) {
                return Promise.resolve({ json: () => Promise.resolve(mockStatusList) })
            }
            if (url.includes('/rest/v1/system_settings')) {
                return Promise.resolve({ json: () => Promise.resolve(mockFpSetting) })
            }
            if (url.includes('/rest/v1/congestion')) {
                return Promise.resolve({ json: () => Promise.resolve(mockCongestionData) })
            }
            return Promise.reject(new Error('Unknown URL'))
        }) as typeof global.fetch

        const result = await getProjectListGranular()

        expect(result.error).toBeNull()
        expect(result.globalFastpassEnabled).toBe(true)
        expect(result.initialUpdatedAtMap).toEqual({ p1: '2026-08-01T00:00:00Z' })
        expect(result.projectsWithStatus).toHaveLength(1)
        expect(result.projectsWithStatus[0]).toMatchObject({
            project_id: 'p1',
            title: 'Project 1',
            congestion_level: 2,
            wait_time_min: 15
        })
    })

    it('should return empty projects and error on fetch failure', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as typeof global.fetch

        const result = await getProjectListGranular()

        expect(result.error).toBe('Failed to fetch projects')
        expect(result.projectsWithStatus).toEqual([])
        expect(result.initialUpdatedAtMap).toEqual({})
    })
})
