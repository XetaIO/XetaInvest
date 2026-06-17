<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\TransactionType;
use App\Models\Position;
use Illuminate\Validation\ValidationException;

class TransactionInventoryValidator
{
    /**
     * Validates the transaction inventory for a given position.
     *
     * @param Position $position The position for which to validate the transaction inventory.
     *
     * @throws ValidationException If the transaction inventory is invalid (e.g., insufficient quantity).
     */
    public function validate(Position $position): void
    {
        $quantity = 0.0;

        $transactions = $position->transactions()
            ->orderBy('executed_at')
            ->orderBy('id')
            ->get();

        foreach ($transactions as $transaction) {
            $transactionQuantity = (float) $transaction->quantity;

            if ($transaction->type === TransactionType::Buy) {
                $quantity += $transactionQuantity;

                continue;
            }

            if ($transactionQuantity > $quantity + 0.0000001) {
                throw ValidationException::withMessages([
                    'quantity' => __('messages.transaction.insufficient_quantity'),
                ]);
            }

            $quantity -= $transactionQuantity;
        }
    }
}
