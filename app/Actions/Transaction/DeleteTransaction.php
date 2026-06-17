<?php

declare(strict_types=1);

namespace App\Actions\Transaction;

use App\Models\Position;
use App\Models\Transaction;
use App\Services\TransactionInventoryValidator;
use Illuminate\Support\Facades\DB;

class DeleteTransaction
{
    public function __construct(private readonly TransactionInventoryValidator $validator)
    {
    }

    /**
     * Deletes the specified transaction and validates the associated position's inventory. It ensures that the position is locked for update during the deletion process to maintain data integrity.
     *
     * @param Transaction $transaction The transaction to be deleted.
     *
     * @return void
     */
    public function handle(Transaction $transaction): void
    {
        DB::transaction(function () use ($transaction): void {
            $position = Position::query()
                ->whereKey($transaction->position_id)
                ->lockForUpdate()
                ->firstOrFail();

            $transaction->delete();
            $this->validator->validate($position);
        });
    }
}
