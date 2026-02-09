export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    user_id: string
                    line_user_id: string | null
                    display_name: string | null
                    role: 'guest' | 'admin'
                    created_at: string
                }
                Insert: {
                    user_id?: string
                    line_user_id?: string | null
                    display_name?: string | null
                    role?: 'guest' | 'admin'
                    created_at?: string
                }
                Update: {
                    user_id?: string
                    line_user_id?: string | null
                    display_name?: string | null
                    role?: 'guest' | 'admin'
                    created_at?: string
                }
            }
            classes: {
                Row: {
                    class_id: string
                    class_name: string
                    password_hash: string
                }
                Insert: {
                    class_id: string
                    class_name: string
                    password_hash: string
                }
                Update: {
                    class_id?: string
                    class_name?: string
                    password_hash?: string
                }
            }
            projects: {
                Row: {
                    project_id: string
                    class_id: string | null
                    type: 'class' | 'food' | 'stage' | 'exhibition' | null
                    title: string
                    description: string | null
                    image_url: string | null
                    fastpass_enabled: boolean | null
                    created_at: string
                }
                Insert: {
                    project_id?: string
                    class_id?: string | null
                    type?: 'class' | 'food' | 'stage' | 'exhibition' | null
                    title: string
                    description?: string | null
                    image_url?: string | null
                    fastpass_enabled?: boolean | null
                    created_at?: string
                }
                Update: {
                    project_id?: string
                    class_id?: string | null
                    type?: 'class' | 'food' | 'stage' | 'exhibition' | null
                    title?: string
                    description?: string | null
                    image_url?: string | null
                    fastpass_enabled?: boolean | null
                    created_at?: string
                }
            }
            congestion: {
                Row: {
                    project_id: string
                    level: number
                    updated_at: string
                }
                Insert: {
                    project_id: string
                    level?: number
                    updated_at?: string
                }
                Update: {
                    project_id?: string
                    level?: number
                    updated_at?: string
                }
            }
            votes: {
                Row: {
                    vote_id: string
                    user_id: string | null
                    project_id: string | null
                    category: 'class' | 'food' | 'stage' | 'exhibition' | null
                    created_at: string
                }
                Insert: {
                    vote_id?: string
                    user_id?: string | null
                    project_id?: string | null
                    category?: 'class' | 'food' | 'stage' | 'exhibition' | null
                    created_at?: string
                }
                Update: {
                    vote_id?: string
                    user_id?: string | null
                    project_id?: string | null
                    category?: 'class' | 'food' | 'stage' | 'exhibition' | null
                    created_at?: string
                }
            }
            fastpass_slots: {
                Row: {
                    slot_id: string
                    project_id: string | null
                    start_time: string
                    end_time: string
                    capacity: number | null
                }
                Insert: {
                    slot_id?: string
                    project_id?: string | null
                    start_time: string
                    end_time: string
                    capacity?: number | null
                }
                Update: {
                    slot_id?: string
                    project_id?: string | null
                    start_time?: string
                    end_time?: string
                    capacity?: number | null
                }
            }
            fastpass_tickets: {
                Row: {
                    ticket_id: string
                    slot_id: string | null
                    user_id: string | null
                    qr_token: string
                    used: boolean | null
                    issued_at: string
                }
                Insert: {
                    ticket_id?: string
                    slot_id?: string | null
                    user_id?: string | null
                    qr_token: string
                    used?: boolean | null
                    issued_at?: string
                }
                Update: {
                    ticket_id?: string
                    slot_id?: string | null
                    user_id?: string | null
                    qr_token?: string
                    used?: boolean | null
                    issued_at?: string
                }
            }
            quiz_questions: {
                Row: {
                    question_id: number
                    question_text: string
                    choices: Json
                    correct_choice_index: number
                }
                Insert: {
                    question_id?: number
                    question_text: string
                    choices: Json
                    correct_choice_index: number
                }
                Update: {
                    question_id?: number
                    question_text?: string
                    choices?: Json
                    correct_choice_index?: number
                }
            }
            quiz_sessions: {
                Row: {
                    session_id: string
                    user_id: string | null
                    questions: Json
                    correct_answers: Json
                    expires_at: string
                }
                Insert: {
                    session_id?: string
                    user_id?: string | null
                    questions: Json
                    correct_answers: Json
                    expires_at: string
                }
                Update: {
                    session_id?: string
                    user_id?: string | null
                    questions?: Json
                    correct_answers?: Json
                    expires_at?: string
                }
            }
            quiz_scores: {
                Row: {
                    user_id: string
                    highest_score: number | null
                    total_score: number | null
                    play_count: number | null
                    updated_at: string
                }
                Insert: {
                    user_id: string
                    highest_score?: number | null
                    total_score?: number | null
                    play_count?: number | null
                    updated_at?: string
                }
                Update: {
                    user_id?: string
                    highest_score?: number | null
                    total_score?: number | null
                    play_count?: number | null
                    updated_at?: string
                }
            }
            operation_logs: {
                Row: {
                    log_id: string
                    operator_id: string | null
                    action: string
                    details: Json | null
                    performed_at: string
                }
                Insert: {
                    log_id?: string
                    operator_id?: string | null
                    action: string
                    details?: Json | null
                    performed_at?: string
                }
                Update: {
                    log_id?: string
                    operator_id?: string | null
                    action?: string
                    details?: Json | null
                    performed_at?: string
                }
            }
        }
        Functions: {
            operator_login: {
                Args: { p_class_id: string; p_password: string }
                Returns: Json
            }
            issue_fastpass_ticket: {
                Args: { p_slot_id: string }
                Returns: Json
            }
            verify_and_use_ticket: {
                Args: { p_qr_token: string; p_operator_token: string }
                Returns: Json
            }
            cast_vote: {
                Args: { p_project_id: string; p_category: string }
                Returns: Json
            }
            operator_update_congestion: {
                Args: { p_operator_token: string; p_level: number }
                Returns: Json
            }
            admin_update_congestion: {
                Args: { p_project_id: string; p_level: number }
                Returns: Json
            }
            admin_reset_all_data: {
                Args: { p_target_table: string; p_confirmation: string }
                Returns: Json
            }
            admin_get_vote_summary: {
                Args: Record<string, never>
                Returns: Json
            }
            start_quiz_session: {
                Args: Record<string, never>
                Returns: Json
            }
            submit_quiz_score: {
                Args: { p_session_id: string; p_answers: Json }
                Returns: Json
            }
            admin_get_projects_status: {
                Args: Record<string, never>
                Returns: Json
            }
            admin_update_setting: {
                Args: { p_key: string; p_value: boolean }
                Returns: Json
            }
            admin_get_fastpass_projects: {
                Args: Record<string, never>
                Returns: Json
            }
            admin_get_project_slots: {
                Args: { p_project_id: string }
                Returns: Json
            }
            admin_update_slot_capacity: {
                Args: { p_slot_id: string; p_capacity: number }
                Returns: Json
            }
            admin_toggle_project_fastpass: {
                Args: { p_project_id: string; p_enabled: boolean }
                Returns: Json
            }
            operator_update_project: {
                Args: { p_operator_token: string; p_description: string; p_image_url: string }
                Returns: Json
            }
        }
        Enums: {
            [_: string]: never
        }
    }
}
