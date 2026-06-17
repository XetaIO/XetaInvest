<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\FinanceQueryException;
use App\Models\Instrument;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class PortfolioTickerService
{
    /**
     * Minimum number of items the ticker should display.
     * If user has fewer portfolio symbols, append market indices to reach this count.
     */
    public const MIN_ITEMS = 15;

    /**
     * Fallback indices appended when the user has fewer than MIN_ITEMS symbols.
     *
     * @var array<string, string>
     */
    public const INDICES = [
        '^FCHI' => 'CAC 40',
        '^GSPC' => 'S&P 500',
        '^STOXX50E' => 'Euro Stoxx 50',
        'EURUSD=X' => 'EUR/USD',
        '^IXIC' => 'Nasdaq Composite',
    ];

    public function __construct(protected FinanceQueryClient $client)
    {
    }

    /**
     * Builds the portfolio ticker data for a given user, including their portfolio symbols and market indices if necessary.
     *
     * @param User $user The user for whom to build the ticker.
     *
     * @return array<int, array{symbol: string, name: string, currency: string, price: float, change: float, change_percent: float, sparkline: array<int, float>}>|null
     *         An array of ticker items or null if no data could be fetched.
     */
    public function buildFor(User $user): ?array
    {
        $userSymbols = $this->collectUserSymbols($user);

        $symbols = $userSymbols;

        if (count($symbols) < self::MIN_ITEMS) {
            foreach (array_keys(self::INDICES) as $index) {
                if (! in_array($index, $symbols, true)) {
                    $symbols[] = $index;
                }
            }
        }

        if (empty($symbols)) {
            return null;
        }

        try {
            $sparks = $this->client->spark($symbols);
        } catch (FinanceQueryException $e) {
            Log::warning('Portfolio ticker spark fetch failed', ['error' => $e->getMessage()]);

            return null;
        }

        if (empty($sparks)) {
            return null;
        }

        $names = $this->resolveNames($userSymbols);

        $items = [];

        foreach ($symbols as $symbol) {
            $data = $sparks[$symbol] ?? null;

            if ($data === null) {
                continue;
            }

            $closes = $data['closes'];
            $count = count($closes);

            if ($count < 2) {
                continue;
            }

            $price = (float) $closes[$count - 1];
            $previous = (float) $closes[$count - 2];
            $change = $price - $previous;
            $changePercent = $previous != 0.0 ? ($change / $previous) * 100.0 : 0.0;

            $items[] = [
                'symbol' => $symbol,
                'name' => $names[$symbol]
                    ?? self::INDICES[$symbol]
                    ?? (string) ($data['meta']['shortName'] ?? $data['meta']['longName'] ?? $symbol),
                'currency' => strtoupper((string) ($data['meta']['currency'] ?? 'USD')),
                'price' => $price,
                'change' => $change,
                'change_percent' => $changePercent,
                'sparkline' => $closes,
            ];
        }

        return $items === [] ? null : $items;
    }

    /**
     * Collects all unique symbols from the user's portfolios, ensuring they are uppercase and trimmed.
     *
     * @param User $user The user whose portfolio symbols are to be collected.
     *
     * @return array An array of unique, uppercase symbols from the user's portfolios.
     */
    protected function collectUserSymbols(User $user): array
    {
        return $user->portfolios()
            ->with(['positions.instrument:id,symbol'])
            ->get()
            ->flatMap(fn ($portfolio) => $portfolio->positions)
            ->map(fn ($position) => strtoupper((string) ($position->instrument->symbol ?? '')))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Resolves the names of instruments based on their symbols. If a symbol does not have a corresponding name in the database, it will be omitted from the result.
     *
     * @param array $symbols An array of symbols for which to resolve names.
     *
     * @return array An associative array mapping symbols to their corresponding names.
     */
    protected function resolveNames(array $symbols): array
    {
        if (empty($symbols)) {
            return [];
        }

        return Instrument::query()
            ->whereIn('symbol', $symbols)
            ->pluck('name', 'symbol')
            ->mapWithKeys(fn ($name, $symbol) => [strtoupper((string) $symbol) => (string) $name])
            ->all();
    }
}
