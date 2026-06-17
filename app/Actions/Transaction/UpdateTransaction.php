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

    /**
     * Updates the specified transaction with the provided data and validates the associated position's inventory. It ensures that the position is locked for update during the transaction update process to maintain data integrity.
     *
     * @param Transaction $transaction The transaction to be updated.
     * @param array $data The data for updating the transaction, including type, amount, and other relevant details.
     *
     * @return Transaction The updated transaction instance.
     */
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
