<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\FinanceQueryException;
use App\Models\Portfolio;
use Illuminate\Support\Collection;

class PortfolioMarketDataFetcher
{
    public function __construct(private readonly FinanceQueryClient $client)
    {
    }

    /**
     * @param  Collection<int, Portfolio>  $portfolios
     * @return array{quotes: array<string, mixed>, fxRates: array<string, float>, error: ?string}
     */
    public function fetch(Collection $portfolios, bool $forceRefresh = false, bool $reportException = false): array
    {
        $symbols = $portfolios
            ->flatMap(fn (Portfolio $portfolio) => $portfolio->positions->map(
                fn ($position) => strtoupper($position->instrument->symbol),
            ))
            ->unique()
            ->values()
            ->all();

        $quotes = [];
        $fxRates = ['EUR' => 1.0];
        $error = null;

        if ($symbols === []) {
            return compact('quotes', 'fxRates', 'error');
        }

        try {
            $quotes = $this->client->quotes($symbols, $forceRefresh);

            $currencies = $portfolios
                ->flatMap(fn (Portfolio $portfolio) => $portfolio->positions->map(
                    fn ($position) => strtoupper($position->instrument->currency ?? 'USD'),
                ))
                ->unique();

            foreach ($currencies as $currency) {
                if (! isset($fxRates[$currency])) {
                    $fxRates[$currency] = $this->client->fxRate($currency, 'EUR');
                }
            }
        } catch (FinanceQueryException $e) {
            if ($reportException) {
                report($e);
                $error = __('messages.market_data.unavailable');
            } else {
                $error = $e->getMessage();
            }
        }

        return compact('quotes', 'fxRates', 'error');
    }
}
