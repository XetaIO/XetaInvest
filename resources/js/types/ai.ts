export interface AiReportRecommendation {
    action?: string;
    symbol?: string | null;
    rationale?: string;
}

export interface AiReportContent {
    summary?: string;
    highlights?: string[];
    risks?: string[];
    recommendations?: AiReportRecommendation[];
    narrative_md?: string;
    [key: string]: unknown;
}

export interface AiReport {
    id: number;
    type: 'portfolio' | 'global' | 'watchlist' | 'news_screener';
    scope_type: string | null;
    scope_id: number | null;
    status: 'pending' | 'success' | 'failed';
    generated_for_date: string;
    content: AiReportContent | null;
    error_message?: string | null;
    model?: string | null;
    provider?: string | null;
    created_at: string;
}

export interface AiToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}

export interface AiChatMessage {
    id: number;
    role: 'user' | 'assistant' | 'tool' | 'system';
    content: string | null;
    tool_calls?: AiToolCall[] | null;
    tool_call_id?: string | null;
    tool_name?: string | null;
    prompt_tokens?: number | null;
    completion_tokens?: number | null;
    created_at: string;
}

export interface AiChatSession {
    id: number;
    title: string | null;
    last_message_at: string | null;
    created_at: string;
    messages?: AiChatMessage[];
}
