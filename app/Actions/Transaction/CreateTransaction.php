<?php

declare(strict_types=1);

namespace App\Actions\Transaction;

use App\Models\Position;
use App\Models\Transaction;
use App\Services\TransactionInventoryValidator;
use Illuminate\Support\Facades\DB;

class CreateTransaction
{
    public function __construct(private readonly TransactionInventoryValidator $validator)
    {
    }

    /**
     * Creates a new transaction for the specified position based on the provided data. It ensures that the position is locked for update during the transaction creation process and validates the position's inventory after the transaction is created.
     *
     * @param Position $position The position for which to create the transaction.
     * @param array $data The data for creating the transaction, including type, amount, and other relevant details.
     *
     * @return Transaction The newly created transaction instance.
     */
    public function handle(Position $position, array $data): Transaction
    {
        return DB::transaction(function () use ($position, $data): Transaction {
            Position::query()->whereKey($position->getKey())->lockForUpdate()->firstOrFail();

            $transaction = $position->transactions()->create($data);
            $this->validator->validate($position);

            return $transaction;
        });
    }
}
