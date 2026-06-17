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
    public function __construct(private readonly FinanceQueryClient $client)
    {
    }

    /**
     * Creates a new position in the specified portfolio based on the provided data. It fetches the latest quote for the instrument, creates or retrieves the instrument, and records the associated transactions.
     *
     * @param Portfolio $portfolio The portfolio in which to create the position.
     * @param array $data The data for creating the position, including symbol and transaction lines.
     *
     * @return Position|null The newly created position instance, or null if the instrument quote could not be retrieved.
     */
    public function handle(Portfolio $portfolio, array $data): ?Position
    {
        $symbol = strtoupper(trim((string) $data['symbol']));

        try {
            // Fetch the latest quote for the instrument using the FinanceQueryClient
            $quote = $this->client->quote($symbol);
        } catch (FinanceQueryException) {
            $quote = null;
        }

        if ($quote === null) {
            return null;
        }

        return DB::transaction(function () use ($portfolio, $symbol, $quote, $data): Position {
            // Create or retrieve the instrument based on the symbol and quote data
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

            // Create or retrieve the position for the specified portfolio and instrument
            $position = Position::firstOrCreate([
                'portfolio_id' => $portfolio->id,
                'instrument_id' => $instrument->id,
            ]);

            // Record the associated transactions for the position based on the provided lines
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
