import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Use service role key to bypass RLS since we verify the signature manually and need to act as an admin to call the DB if needed
// Actually, the DB RPC `submit_quiz_score` uses `auth.uid()`, so the user MUST be authenticated.
// To pass the user's auth token, we must create a Supabase client using the Authorization header.
// Or we can just use the standard Supabase client with the user's token.

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json({ status: 401, message: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { score } = body

        if (typeof score !== 'number' || score < 0 || score > 10) {
            return NextResponse.json({ status: 400, message: 'Invalid score' }, { status: 400 })
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

        const s = settings as any
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
        // In production, this should be in an environment variable, but for now we hardcode it to match the SQL.
        const serverSecret = 'NgtFes26_Super_Secret_Key'
        const hmac = crypto.createHmac('sha256', serverSecret)

        // user_id || score (as strings)
        hmac.update(`${user.id}${score}`)
        const signature = hmac.digest('hex')

        // Call the RPC
        const { data, error } = await userSupabase.rpc('submit_quiz_score', {
            p_score: score,
            p_signature: signature
        })

        if (error) {
            if (error.message.includes('Please wait before playing again')) {
                return NextResponse.json({ status: 429, message: 'Rate limit exceeded' }, { status: 429 })
            }
            if (error.message.includes('Invalid signature')) {
                return NextResponse.json({ status: 403, message: 'Invalid signature' }, { status: 403 })
            }
            throw error
        }

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Quiz submit error:', error)
        return NextResponse.json({ status: 500, message: 'Internal Server Error' }, { status: 500 })
    }
}
