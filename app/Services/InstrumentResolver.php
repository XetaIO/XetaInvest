<?php

namespace App\Services;

use App\Models\Instrument;

class InstrumentResolver
{
    public function __construct(private readonly FinanceQueryClient $client)
    {
    }

    public function resolve(string $symbol): ?Instrument
    {
        $symbol = strtoupper(trim($symbol));

        if ($symbol === '') {
            return null;
        }

        $instrument = Instrument::query()->where('symbol', $symbol)->first();

        if ($instrument !== null) {
            return $instrument;
        }

        $results = $this->client->search($symbol, 5);
        $match = collect($results)->firstWhere('symbol', $symbol);
        $quote = $this->client->quote($symbol);

        if ($match === null) {
            if ($quote === null) {
                return null;
            }

            $match = [
                'symbol' => $symbol,
                'name' => $quote['name'] ?? $quote['shortName'] ?? $quote['longName'] ?? $symbol,
                'exchange' => $quote['exchange'] ?? null,
                'type' => $quote['quoteType'] ?? $quote['type'] ?? null,
            ];
        }

        return Instrument::create([
            'symbol' => $symbol,
            'name' => $match['name'] ?? $symbol,
            'exchange' => $match['exchange'] ?? null,
            'type' => $match['type'] ?? null,
            'currency' => strtoupper($quote['currency'] ?? 'USD'),
        ]);
    }
}
