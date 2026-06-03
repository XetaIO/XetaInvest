<?php

declare(strict_types=1);

namespace App\Actions\Position;

use App\Enums\TransactionType;
use App\Exceptions\FinanceQueryException;
use App\Models\Instrument;
use App\Models\Portfolio;
use App\Models\Position;
use App\Services\FinanceQueryClient;
use Illuminate\Support\Facades\DB;

class CreatePosition
{
    public function __construct(private readonly FinanceQueryClient $client) {}

    /**
     * @param  array<string, mixed>  $data
     * @return Position|null Returns null when the symbol cannot be resolved
     */
    public function handle(Portfolio $portfolio, array $data): ?Position
    {
        $symbol = strtoupper(trim((string) $data['symbol']));

        try {
            $quote = $this->client->quote($symbol);
        } catch (FinanceQueryException) {
            $quote = null;
        }

        if ($quote === null) {
            return null;
        }

        return DB::transaction(function () use ($portfolio, $symbol, $quote, $data): Position {
            $instrument = Instrument::firstOrCreate(
                ['symbol' => $symbol],
                [
                    'name' => $quote['longName'] ?? $quote['shortName'] ?? $symbol,
                    'exchange' => $quote['exchangeName'] ?? $quote['exchange'] ?? null,
                    'type' => $quote['quoteType'] ?? null,
                    'currency' => strtoupper($quote['currency'] ?? 'USD'),
                    'last_synced_at' => now(),
                ],
            );

            $position = Position::firstOrCreate([
                'portfolio_id' => $portfolio->id,
                'instrument_id' => $instrument->id,
            ]);

            foreach ($data['lines'] as $line) {
                $position->transactions()->create([
                    'type' => TransactionType::Buy,
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'executed_at' => $line['executed_at'],
                    'notes' => $line['notes'] ?? null,
                ]);
            }

            return $position;
        });
    }
}
