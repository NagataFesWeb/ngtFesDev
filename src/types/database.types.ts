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
                Relationships: []
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
                Relationships: []
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
                    rotation_time_min: number
                    max_queue_size: number
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
                    rotation_time_min?: number
                    max_queue_size?: number
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
                    rotation_time_min?: number
                    max_queue_size?: number
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "projects_class_id_fkey"
                        columns: ["class_id"]
                        referencedRelation: "classes"
                        referencedColumns: ["class_id"]
                    }
                ]
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
                Relationships: [
                    {
                        foreignKeyName: "congestion_project_id_fkey"
                        columns: ["project_id"]
                        referencedRelation: "projects"
                        referencedColumns: ["project_id"]
                    }
                ]
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
                Relationships: [
                    {
                        foreignKeyName: "fastpass_slots_project_id_fkey"
                        columns: ["project_id"]
                        referencedRelation: "projects"
                        referencedColumns: ["project_id"]
                    }
                ]
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
                Relationships: [
                    {
                        foreignKeyName: "fastpass_tickets_slot_id_fkey"
                        columns: ["slot_id"]
                        referencedRelation: "fastpass_slots"
                        referencedColumns: ["slot_id"]
                    },
                    {
                        foreignKeyName: "fastpass_tickets_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["user_id"]
                    }
                ]
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
                Relationships: []
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
                Relationships: []
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
                Relationships: []
            }
            quiz_rewards: {
                Row: {
                    id: number
                    required_score: number
                    title_name: string
                    storage_path: string
                    created_at: string
                }
                Insert: {
                    id?: number
                    required_score: number
                    title_name: string
                    storage_path: string
                    created_at?: string
                }
                Update: {
                    id?: number
                    required_score?: number
                    title_name?: string
                    storage_path?: string
                    created_at?: string
                }
                Relationships: []
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
                Relationships: []
            }
            system_settings: {
                Row: {
                    key: string
                    value: Json
                    description: string | null
                    updated_at: string
                }
                Insert: {
                    key: string
                    value: Json
                    description?: string | null
                    updated_at?: string
                }
                Update: {
                    key?: string
                    value?: Json
                    description?: string | null
                    updated_at?: string
                }
                Relationships: []
            }
            news: {
                Row: {
                    news_id: string
                    content: string
                    is_important: boolean
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    news_id?: string
                    content: string
                    is_important?: boolean
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    news_id?: string
                    content?: string
                    is_important?: boolean
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_: string]: never
        }
        Functions: {
            operator_login: {
                Args: { p_class_id: string; p_password: string }
                Returns: Json
            }
            operator_update_project: {
                Args: { p_operator_token: string; p_description: string; p_image_url: string }
                Returns: Json
            }
            operator_update_congestion: {
                Args: { p_operator_token: string; p_level: number }
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
            submit_quiz_score: {
                Args: { p_score: number; p_signature: string }
                Returns: Json
            }
            get_quiz_ranking: {
                Args: Record<string, never>
                Returns: {
                    display_name: string
                    highest_score: number
                    total_score: number
                    play_count: number
                }[]
            }
            get_quiz_questions: {
                Args: Record<string, never>
                Returns: Json
            }
            get_quiz_reward_url: {
                Args: { p_reward_id: number }
                Returns: Json
            }
            get_estimated_wait_time: {
                Args: { p_project_id: string }
                Returns: number
            }
            get_projects_with_status: {
                Args: Record<string, never>
                Returns: {
                    project_id: string
                    class_id: string
                    type: string
                    title: string
                    description: string
                    image_url: string
                    fastpass_enabled: boolean
                    congestion_level: number
                    wait_time_min: number
                }[]
            }
            admin_update_congestion: {
                Args: { p_project_id: string; p_level: number }
                Returns: Json
            }
            admin_reset_all_data: {
                Args: { p_target_table: string; p_confirmation: string }
                Returns: Json
            }
            admin_get_projects_status: {
                Args: Record<string, never>
                Returns: {
                    project_id: string
                    title: string
                    class_name: string
                    congestion_level: number
                    updated_at: string
                }[]
            }
            admin_update_setting: {
                Args: { p_key: string; p_value: Json }
                Returns: Json
            }
            admin_get_fastpass_projects: {
                Args: Record<string, never>
                Returns: {
                    project_id: string
                    title: string
                    class_name: string
                    fastpass_enabled: boolean
                    total_slots: number
                    total_issued: number
                }[]
            }
            admin_get_project_slots: {
                Args: { p_project_id: string }
                Returns: {
                    slot_id: string
                    start_time: string
                    end_time: string
                    capacity: number
                    issued_count: number
                }[]
            }
            admin_update_slot_capacity: {
                Args: { p_slot_id: string; p_capacity: number }
                Returns: Json
            }
            admin_toggle_project_fastpass: {
                Args: { p_project_id: string; p_enabled: boolean }
                Returns: Json
            }
        }
        Enums: {
            [_: string]: never
        }
        CompositeTypes: {
            [_: string]: never
        }
    }
}