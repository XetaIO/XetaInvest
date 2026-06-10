<?php

declare(strict_types=1);

namespace App\Services\Ai\Tools\Concrete;

use App\Models\User;
use App\Services\Ai\Tools\AiTool;
use App\Services\FinanceQueryClient;
use Throwable;

class GetNewsTool implements AiTool
{
    public function __construct(protected FinanceQueryClient $finance)
    {
    }

    public function name(): string
    {
        return 'get_news';
    }

    public function description(): string
    {
        return 'Get the latest news articles for a given ticker symbol.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'symbol' => [
                    'type' => 'string',
                    'description' => 'Ticker symbol.',
                ],
                'limit' => [
                    'type' => 'integer',
                    'description' => 'Max number of articles (default 10).',
                ],
            ],
            'required' => ['symbol'],
        ];
    }

    public function execute(User $user, array $args): array
    {
        $symbol = strtoupper(trim((string) ($args['symbol'] ?? '')));
        $limit = max(1, min(20, (int) ($args['limit'] ?? 10)));

        if ($symbol === '') {
            return ['error' => 'symbol_required'];
        }

        try {
            $items = $this->finance->news($symbol);
        } catch (Throwable $e) {
            return ['error' => 'finance_query_failed'];
        }

        $items = array_slice($items, 0, $limit);

        $items = array_map(static function (array $i): array {
            return [
                'title' => $i['title'] ?? null,
                'publisher' => $i['publisher'] ?? null,
                'link' => $i['link'] ?? null,
                'published_at' => $i['providerPublishTime'] ?? $i['published_at'] ?? null,
                'summary' => $i['summary'] ?? null,
            ];
        }, $items);

        return ['symbol' => $symbol, 'news' => $items];
    }
}
