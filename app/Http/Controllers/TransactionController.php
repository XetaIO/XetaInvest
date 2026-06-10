<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Transaction\CreateTransaction;
use App\Actions\Transaction\DeleteTransaction;
use App\Actions\Transaction\UpdateTransaction;
use App\Http\Requests\Transaction\StoreTransactionRequest;
use App\Http\Requests\Transaction\UpdateTransactionRequest;
use App\Models\Position;
use App\Models\Transaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TransactionController extends Controller
{
    public function store(
        StoreTransactionRequest $request,
        Position $position,
        CreateTransaction $action,
    ): RedirectResponse {
        $action->handle($position, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.transaction.added')]);

        return back();
    }

    public function update(
        UpdateTransactionRequest $request,
        Transaction $transaction,
        UpdateTransaction $action,
    ): RedirectResponse {
        $action->handle($transaction, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.transaction.updated')]);

        return back();
    }

    public function destroy(
        Request $request,
        Transaction $transaction,
        DeleteTransaction $action,
    ): RedirectResponse {
        $this->authorize('delete', $transaction);

        $action->handle($transaction);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.transaction.deleted')]);

        return back();
    }
}
