<?php

declare(strict_types=1);

namespace App\Services\Ai\Tools\Concrete;

use App\Models\User;
use App\Services\Ai\Tools\AiTool;
use App\Services\FinanceQueryClient;
use Throwable;

class GetQuoteTool implements AiTool
{
    public function __construct(protected FinanceQueryClient $finance)
    {
    }

    public function name(): string
    {
        return 'get_quote';
    }

    public function description(): string
    {
        return 'Get a detailed quote for one symbol: price, change, market cap, fundamentals (P/E, EPS, dividend, etc.).';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'symbol' => [
                    'type' => 'string',
                    'description' => 'Ticker symbol (e.g. AAPL, MC.PA).',
                ],
            ],
            'required' => ['symbol'],
        ];
    }

    public function execute(User $user, array $args): array
    {
        $symbol = strtoupper(trim((string) ($args['symbol'] ?? '')));

        if ($symbol === '') {
            return ['error' => 'symbol_required'];
        }

        try {
            $quote = $this->finance->quoteDetail($symbol);
        } catch (Throwable $e) {
            return ['error' => 'finance_query_failed'];
        }

        if ($quote === null) {
            return ['error' => 'symbol_not_found', 'symbol' => $symbol];
        }

        return ['symbol' => $symbol, 'quote' => $quote];
    }
}
