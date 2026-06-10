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

    /** @param array<string, mixed> $data */
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
