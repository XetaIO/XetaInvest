<?php

declare(strict_types=1);

namespace App\Services\Ai\Tools\Concrete;

use App\Models\User;
use App\Services\Ai\Tools\AiScreenerFieldRegistry;
use App\Services\Ai\Tools\AiTool;
use App\Services\FinanceQueryClient;
use Throwable;

class ScreenStocksTool implements AiTool
{
    public function __construct(protected FinanceQueryClient $finance)
    {
    }

    public function name(): string
    {
        return 'screen_stocks';
    }

    public function description(): string
    {
        return 'Run a custom stock screener via POST /v2/screeners/custom. Use to find stocks matching filters (region, sector, market cap, valuation, growth metrics, etc.). Returns matching tickers with their metrics.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'quote_type' => [
                    'type' => 'string',
                    'enum' => AiScreenerFieldRegistry::QUOTE_TYPES,
                    'description' => 'Type of quote to filter (default EQUITY).',
                ],
                'filters' => [
                    'type' => 'array',
                    'description' => 'Array of filter objects.',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'field' => [
                                'type' => 'string',
                                'enum' => AiScreenerFieldRegistry::FIELDS,
                            ],
                            'operator' => [
                                'type' => 'string',
                                'enum' => AiScreenerFieldRegistry::OPERATORS,
                            ],
                            'value' => [
                                'description' => 'Scalar value, or [min,max] when operator is btwn.',
                            ],
                        ],
                        'required' => ['field', 'operator', 'value'],
                    ],
                ],
                'fields' => [
                    'type' => 'array',
                    'description' => 'Fields to return for each result.',
                    'items' => ['type' => 'string', 'enum' => AiScreenerFieldRegistry::FIELDS],
                ],
                'sort' => [
                    'type' => 'object',
                    'properties' => [
                        'field' => ['type' => 'string', 'enum' => AiScreenerFieldRegistry::FIELDS],
                        'direction' => ['type' => 'string', 'enum' => ['asc', 'desc']],
                    ],
                ],
                'limit' => [
                    'type' => 'integer',
                    'description' => 'Max results (default 20, max 50).',
                ],
            ],
            'required' => ['filters'],
        ];
    }

    public function execute(User $user, array $args): array
    {
        $filters = $this->sanitizeFilters($args['filters'] ?? []);

        if ($filters === []) {
            return ['error' => 'at_least_one_filter_required'];
        }

        $fields = array_values(array_filter(
            (array) ($args['fields'] ?? []),
            static fn ($f): bool => is_string($f) && AiScreenerFieldRegistry::isField($f),
        ));

        $payload = [
            'quoteType' => in_array($args['quote_type'] ?? null, AiScreenerFieldRegistry::QUOTE_TYPES, true)
                ? $args['quote_type']
                : 'EQUITY',
            'filters' => $filters,
            'limit' => max(1, min(50, (int) ($args['limit'] ?? 20))),
        ];

        if ($fields !== []) {
            $payload['fields'] = $fields;
        }

        if (
            isset($args['sort']['field'], $args['sort']['direction'])
            && AiScreenerFieldRegistry::isField((string) $args['sort']['field'])
            && in_array($args['sort']['direction'], ['asc', 'desc'], true)
        ) {
            $payload['sort'] = [
                'field' => $args['sort']['field'],
                'direction' => $args['sort']['direction'],
            ];
        }

        try {
            $result = $this->finance->screener($payload);
        } catch (Throwable $e) {
            return ['error' => 'screener_failed', 'message' => $e->getMessage()];
        }

        return $result;
    }

    /**
     * @param  mixed  $filters
     * @return array<int, array{field: string, operator: string, value: mixed}>
     */
    protected function sanitizeFilters($filters): array
    {
        if (! is_array($filters)) {
            return [];
        }

        $clean = [];

        foreach ($filters as $f) {
            if (! is_array($f)) {
                continue;
            }

            $field = (string) ($f['field'] ?? '');
            $op = (string) ($f['operator'] ?? '');

            if (! AiScreenerFieldRegistry::isField($field) || ! AiScreenerFieldRegistry::isOperator($op)) {
                continue;
            }

            $clean[] = [
                'field' => $field,
                'operator' => $op,
                'value' => $f['value'] ?? null,
            ];
        }

        return $clean;
    }
}
