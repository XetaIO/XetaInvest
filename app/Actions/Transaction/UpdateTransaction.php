<?php

declare(strict_types=1);

namespace App\Actions\Transaction;

use App\Models\Position;
use App\Models\Transaction;
use App\Services\TransactionInventoryValidator;
use Illuminate\Support\Facades\DB;

class UpdateTransaction
{
    public function __construct(private readonly TransactionInventoryValidator $validator)
    {
    }

    /** @param array{type: \App\Enums\TransactionType, quantity: float|int|string, unit_price: float|int|string, executed_at: string, notes?: string|null} $data */
    public function handle(Transaction $transaction, array $data): Transaction
    {
        return DB::transaction(function () use ($transaction, $data): Transaction {
            Position::query()->whereKey($transaction->position_id)->lockForUpdate()->firstOrFail();

            $transaction->update($data);
            $this->validator->validate($transaction->position);

            return $transaction->refresh();
        });
    }
}
