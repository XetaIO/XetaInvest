<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\TransactionType;
use App\Models\Portfolio;
use App\Models\Position;

class PortfolioCalculator
{
    /**
     * Compute KPIs for a single position.
     *
     * Cost basis: WAC for the aggregate open quantity, FIFO matching of sells to buy lines
     * to derive each line's remaining quantity (preserved for the accordion display).
     *
     * @param  array<string, mixed>|null  $quote  Raw quote payload (regularMarketPrice, regularMarketPreviousClose, currency, ...)
     * @return array{
     *   quantity: float,
     *   avg_cost_native: float,
     *   invested_native: float,
     *   current_value_native: float,
     *   pnl_native: float,
     *   invested_eur: float,
     *   current_value_eur: float,
     *   pnl_eur: float,
     *   pnl_pct: float,
     *   daily_change_eur: float,
     *   daily_change_pct: float,
     *   currency: string,
     *   fx_rate: float,
     *   price: float,
     *   previous_close: float,
     *   realized_pnl_native: float,
     *   realized_pnl_eur: float,
     *   lines: array<int, array{
     *     transaction_id: int,
     *     executed_at: string,
     *     original_quantity: float,
     *     remaining_quantity: float,
     *     unit_price: float,
     *     invested_native: float,
     *     current_value_native: float,
     *     pnl_native: float,
     *     pnl_pct: float,
     *   }>
     * }
     */
    public function computePosition(Position $position, ?array $quote, float $fxRate): array
    {
        $currency = $position->instrument->currency ?? ($quote['currency'] ?? 'USD');
        $price = (float) ($quote['regularMarketPrice'] ?? 0.0);
        $previousClose = (float) ($quote['regularMarketPreviousClose'] ?? $price);

        $transactions = $position->transactions
            ->sortBy([['executed_at', 'asc'], ['id', 'asc']])
            ->values();

        /** @var array<int, array{transaction_id:int, executed_at:string, original_quantity:float, remaining_quantity:float, unit_price:float}> $lines */
        $lines = [];
        $realizedNative = 0.0;

        foreach ($transactions as $tx) {
            if ($tx->type === TransactionType::Buy) {
                $lines[] = [
                    'transaction_id' => $tx->id,
                    'executed_at' => $tx->executed_at?->toDateString() ?? '',
                    'original_quantity' => (float) $tx->quantity,
                    'remaining_quantity' => (float) $tx->quantity,
                    'unit_price' => (float) $tx->unit_price,
                ];

                continue;
            }

            // SELL — match FIFO against open buy lines
            $remainingToSell = (float) $tx->quantity;
            $sellPrice = (float) $tx->unit_price;

            foreach ($lines as &$line) {
                if ($remainingToSell <= 0.0) {
                    break;
                }
                if ($line['remaining_quantity'] <= 0.0) {
                    continue;
                }

                $consumed = min($line['remaining_quantity'], $remainingToSell);
                $realizedNative += ($sellPrice - $line['unit_price']) * $consumed;
                $line['remaining_quantity'] -= $consumed;
                $remainingToSell -= $consumed;
            }
            unset($line);
        }

        $quantity = 0.0;
        $investedNative = 0.0;

        foreach ($lines as &$line) {
            $line['invested_native'] = $line['remaining_quantity'] * $line['unit_price'];
            $line['current_value_native'] = $line['remaining_quantity'] * $price;
            $line['pnl_native'] = $line['current_value_native'] - $line['invested_native'];
            $line['pnl_pct'] = $line['invested_native'] > 0.0
                ? ($line['pnl_native'] / $line['invested_native']) * 100.0
                : 0.0;

            $quantity += $line['remaining_quantity'];
            $investedNative += $line['invested_native'];
        }
        unset($line);

        $avgCostNative = $quantity > 0.0 ? $investedNative / $quantity : 0.0;
        $currentValueNative = $quantity * $price;
        $pnlNative = $currentValueNative - $investedNative;

        $investedEur = $investedNative * $fxRate;
        $currentValueEur = $currentValueNative * $fxRate;
        $pnlEur = $pnlNative * $fxRate;
        $pnlPct = $investedNative > 0.0 ? ($pnlNative / $investedNative) * 100.0 : 0.0;

        $dailyChangeNative = $quantity * ($price - $previousClose);
        $dailyChangeEur = $dailyChangeNative * $fxRate;
        $previousValueEur = $quantity * $previousClose * $fxRate;
        $dailyChangePct = $previousValueEur > 0.0 ? ($dailyChangeEur / $previousValueEur) * 100.0 : 0.0;

        return [
            'quantity' => $quantity,
            'avg_cost_native' => $avgCostNative,
            'invested_native' => $investedNative,
            'current_value_native' => $currentValueNative,
            'pnl_native' => $pnlNative,
            'invested_eur' => $investedEur,
            'current_value_eur' => $currentValueEur,
            'pnl_eur' => $pnlEur,
            'pnl_pct' => $pnlPct,
            'daily_change_eur' => $dailyChangeEur,
            'daily_change_pct' => $dailyChangePct,
            'currency' => $currency,
            'fx_rate' => $fxRate,
            'price' => $price,
            'previous_close' => $previousClose,
            'realized_pnl_native' => $realizedNative,
            'realized_pnl_eur' => $realizedNative * $fxRate,
            'lines' => $lines,
        ];
    }

    /**
     * Compute aggregated KPIs for a whole portfolio.
     *
     * @param  array<string, array<string, mixed>>  $quotes  keyed by symbol
     * @param  array<string, float>  $fxRates  keyed by source currency
     * @return array{
     *   total_invested_eur: float,
     *   current_value_eur: float,
     *   pnl_eur: float,
     *   pnl_pct: float,
     *   daily_change_eur: float,
     *   daily_change_pct: float,
     *   positions: array<int, array<string, mixed>>
     * }
     */
    public function computePortfolio(Portfolio $portfolio, array $quotes, array $fxRates): array
    {
        $totalInvested = 0.0;
        $totalCurrent = 0.0;
        $totalPreviousValue = 0.0;
        $positions = [];

        foreach ($portfolio->positions as $position) {
            $symbol = strtoupper($position->instrument->symbol);
            $quote = $quotes[$symbol] ?? null;
            $currency = $position->instrument->currency ?? 'USD';
            $fxRate = $fxRates[strtoupper($currency)] ?? 1.0;

            $computed = $this->computePosition($position, $quote, $fxRate);

            $totalInvested += $computed['invested_eur'];
            $totalCurrent += $computed['current_value_eur'];
            $totalPreviousValue += $computed['quantity'] * $computed['previous_close'] * $computed['fx_rate'];

            $positions[] = [
                'position_id' => $position->id,
                'instrument' => [
                    'id' => $position->instrument->id,
                    'symbol' => $position->instrument->symbol,
                    'name' => $position->instrument->name,
                    'currency' => $currency,
                    'exchange' => $position->instrument->exchange,
                ],
                ...$computed,
            ];
        }

        $pnlEur = $totalCurrent - $totalInvested;
        $dailyChangeEur = $totalCurrent - $totalPreviousValue;

        return [
            'total_invested_eur' => $totalInvested,
            'current_value_eur' => $totalCurrent,
            'pnl_eur' => $pnlEur,
            'pnl_pct' => $totalInvested > 0.0 ? ($pnlEur / $totalInvested) * 100.0 : 0.0,
            'daily_change_eur' => $dailyChangeEur,
            'daily_change_pct' => $totalPreviousValue > 0.0 ? ($dailyChangeEur / $totalPreviousValue) * 100.0 : 0.0,
            'positions' => $positions,
        ];
    }
}
