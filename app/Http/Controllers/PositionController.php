<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\TransactionType;
use App\Exceptions\FinanceQueryException;
use App\Http\Requests\Position\StorePositionRequest;
use App\Models\Instrument;
use App\Models\Portfolio;
use App\Models\Position;
use App\Services\FinanceQueryClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PositionController extends Controller
{
    public function store(
        StorePositionRequest $request,
        Portfolio $portfolio,
        FinanceQueryClient $client,
    ): RedirectResponse {
        $data = $request->validated();
        $symbol = strtoupper(trim((string) $data['symbol']));

        try {
            $quote = $client->quote($symbol);
        } catch (FinanceQueryException $e) {
            $quote = null;
        }

        if ($quote === null) {
            return back()->withErrors(['symbol' => __('Symbole introuvable.')]);
        }

        DB::transaction(function () use ($portfolio, $symbol, $quote, $data): void {
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
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Investissement ajouté.')]);

        return back();
    }

    public function destroy(Request $request, Position $position): RedirectResponse
    {
        $this->authorize('delete', $position);

        $position->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Position supprimée.')]);

        return back();
    }
}
