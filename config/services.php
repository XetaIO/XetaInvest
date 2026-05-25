<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'finance_query' => [
        'url' => env('FINANCE_QUERY_URL', 'https://finance-query.com'),
        'timeout' => env('FINANCE_QUERY_TIMEOUT', 5),
        'quote_ttl' => env('FINANCE_QUERY_QUOTE_TTL', 60),
        'fx_ttl' => env('FINANCE_QUERY_FX_TTL', 300),
        'search_ttl' => env('FINANCE_QUERY_SEARCH_TTL', 60),
        'news_ttl' => env('FINANCE_QUERY_NEWS_TTL', 900),
        'ws_url' => env('FINANCE_QUERY_WS_URL', 'wss://finance-query.com/v2/stream'),
    ],

    'openai' => [
        'key' => env('OPENAI_API_KEY'),
        'base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        'organization' => env('OPENAI_ORGANIZATION'),
        'timeout' => env('OPENAI_TIMEOUT', 60),
    ],

];
