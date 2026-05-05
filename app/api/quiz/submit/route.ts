import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json({ status: 401, message: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { score_delta, highest_score, play_count } = body

        if (
            typeof score_delta !== 'number' || score_delta < 0 ||
            typeof highest_score !== 'number' || highest_score < 0 || highest_score > 10 ||
            typeof play_count !== 'number' || play_count < 0
        ) {
            return NextResponse.json({ status: 400, message: 'Invalid parameters' }, { status: 400 })
        }

        // Initialize Supabase client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const supabase = createClient(supabaseUrl, supabaseAnonKey)

        // Check if quiz is enabled
        const { data: settings, error: settingsError } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'quiz_enabled')
            .single()

        const s = settings as { value: boolean | string }
        if (settingsError || !settings || (s.value !== true && s.value !== 'true')) {
            return NextResponse.json({ status: 403, message: 'Currently unavailable' }, { status: 403 })
        }

        // Create a new client with the user's token for auth.uid() in RPC
        const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: authHeader
                }
            }
        })

        // Get user info to generate signature
        const { data: { user }, error: authError } = await userSupabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ status: 401, message: 'Unauthorized' }, { status: 401 })
        }

        // Generate HMAC signature (same secret used in the DB: 'NgtFes26_Super_Secret_Key')
        const serverSecret = 'NgtFes26_Super_Secret_Key'
        const hmac = crypto.createHmac('sha256', serverSecret)

        // user_id || score_delta || highest_score || play_count
        hmac.update(`${user.id}${score_delta}${highest_score}${play_count}`)
        const signature = hmac.digest('hex')

        // Call the RPC
        const { data, error } = await userSupabase.rpc('submit_quiz_score_batch', {
            p_score_delta: score_delta,
            p_highest_score: highest_score,
            p_play_count: play_count,
            p_signature: signature
        })

        if (error) {
            if (error.message.includes('Invalid signature')) {
                return NextResponse.json({ status: 403, message: 'Invalid signature' }, { status: 403 })
            }
            throw error
        }

        return NextResponse.json(data)
    } catch (error: unknown) {
        console.error('Quiz submit error:', error)
        return NextResponse.json({ status: 500, message: 'Internal Server Error' }, { status: 500 })
    }
}
