<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default AI Provider
    |--------------------------------------------------------------------------
    */
    'default' => env('AI_DEFAULT_PROVIDER', 'openai'),

    /*
    |--------------------------------------------------------------------------
    | Providers
    |--------------------------------------------------------------------------
    */
    'providers' => [

        'openai' => [
            'driver' => 'openai',
            'api_key' => env('OPENAI_API_KEY'),
            'base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
            'organization' => env('OPENAI_ORGANIZATION'),
            'timeout' => (float) env('OPENAI_TIMEOUT', 60),
            // Approximate USD price per 1K tokens (gpt-4o-mini defaults).
            'cost_per_1k' => [
                'prompt' => (float) env('OPENAI_COST_PROMPT_1K', 0.00015),
                'completion' => (float) env('OPENAI_COST_COMPLETION_1K', 0.0006),
            ],
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Models per usage
    |--------------------------------------------------------------------------
    */
    'models' => [
        'chat' => env('AI_CHAT_MODEL', 'gpt-4o-mini'),
        'report' => env('AI_REPORT_MODEL', 'gpt-4o'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Defaults applied to provider calls
    |--------------------------------------------------------------------------
    */
    'defaults' => [
        'temperature' => (float) env('AI_TEMPERATURE', 0.3),
        'max_tokens' => (int) env('AI_MAX_TOKENS', 2000),
        'max_tool_iterations' => (int) env('AI_MAX_TOOL_ITERATIONS', 5),
        'chat_history_limit' => (int) env('AI_CHAT_HISTORY_LIMIT', 20),
    ],

    /*
    |--------------------------------------------------------------------------
    | Quotas (token-based, daily)
    |--------------------------------------------------------------------------
    | Set to 0 to disable a given quota.
    */
    'quotas' => [
        'daily_tokens_per_user' => (int) env('AI_DAILY_TOKEN_QUOTA_USER', 200000),
        'daily_tokens_global' => (int) env('AI_DAILY_TOKEN_QUOTA_GLOBAL', 2000000),
    ],

    /*
    |--------------------------------------------------------------------------
    | Screener report defaults (news page)
    |--------------------------------------------------------------------------
    */
    'screener_defaults' => [
        'regions' => ['fr', 'us'],
        'per_region_limit' => 10,
        'min_market_cap' => 1_000_000_000,
        'min_revenue_growth' => 0.15,
        'min_percent_change' => 0,
    ],

];
