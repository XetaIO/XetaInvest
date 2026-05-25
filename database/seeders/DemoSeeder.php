<?php

namespace Database\Seeders;

use App\Enums\TransactionType;
use App\Models\Instrument;
use App\Models\Portfolio;
use App\Models\Position;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'demo@xetainvest.test'],
            [
                'name' => 'Demo Investor',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ],
        );

        $main = Portfolio::firstOrCreate(
            ['user_id' => $user->id, 'name' => 'Portefeuille principal'],
            ['is_default' => true],
        );

        $watch = Portfolio::firstOrCreate(
            ['user_id' => $user->id, 'name' => 'Watchlist long terme'],
            ['is_default' => false],
        );

        $aapl = Instrument::firstOrCreate(
            ['symbol' => 'AAPL'],
            ['name' => 'Apple Inc.', 'exchange' => 'NASDAQ', 'type' => 'stock', 'currency' => 'USD'],
        );

        $psp = Instrument::firstOrCreate(
            ['symbol' => 'PSP5.PA'],
            ['name' => 'Amundi PEA S&P 500 ESG UCITS ETF', 'exchange' => 'Paris', 'type' => 'etf', 'currency' => 'EUR'],
        );

        $aaplPosition = Position::firstOrCreate([
            'portfolio_id' => $main->id,
            'instrument_id' => $aapl->id,
        ]);

        if ($aaplPosition->transactions()->doesntExist()) {
            Transaction::create([
                'position_id' => $aaplPosition->id,
                'type' => TransactionType::Buy,
                'quantity' => 10,
                'unit_price' => 165.40,
                'executed_at' => now()->subMonths(6),
                'notes' => 'Premier achat AAPL',
            ]);
            Transaction::create([
                'position_id' => $aaplPosition->id,
                'type' => TransactionType::Buy,
                'quantity' => 5,
                'unit_price' => 188.20,
                'executed_at' => now()->subMonths(3),
                'notes' => null,
            ]);
            Transaction::create([
                'position_id' => $aaplPosition->id,
                'type' => TransactionType::Sell,
                'quantity' => 3,
                'unit_price' => 210.00,
                'executed_at' => now()->subWeeks(2),
                'notes' => 'Prise partielle',
            ]);
        }

        $pspPosition = Position::firstOrCreate([
            'portfolio_id' => $main->id,
            'instrument_id' => $psp->id,
        ]);

        if ($pspPosition->transactions()->doesntExist()) {
            Transaction::create([
                'position_id' => $pspPosition->id,
                'type' => TransactionType::Buy,
                'quantity' => 40,
                'unit_price' => 28.95,
                'executed_at' => now()->subMonths(8),
                'notes' => 'DCA mensuel',
            ]);
            Transaction::create([
                'position_id' => $pspPosition->id,
                'type' => TransactionType::Buy,
                'quantity' => 20,
                'unit_price' => 31.40,
                'executed_at' => now()->subMonths(2),
                'notes' => null,
            ]);
        }

        unset($watch);
    }
}
