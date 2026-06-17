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
    /**
     * Store a newly created transaction in storage.
     *
     * @param StoreTransactionRequest $request The validated request containing the new transaction data.
     * @param Position $position The position model to which the transaction will be added.
     * @param CreateTransaction $action The action to create a new transaction.
     *
     * @return RedirectResponse A redirect response back to the previous page with a success message or error.
     */
    public function store(
        StoreTransactionRequest $request,
        Position $position,
        CreateTransaction $action,
    ): RedirectResponse {
        $action->handle($position, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.transaction.added')]);

        return back();
    }

    /**
     * Update the specified transaction in storage.
     *
     * @param UpdateTransactionRequest $request The validated request containing the updated transaction data.
     * @param Transaction $transaction The transaction model to be updated.
     * @param UpdateTransaction $action The action to update the transaction.
     *
     * @return RedirectResponse A redirect response back to the previous page with a success message or error.
     */
    public function update(
        UpdateTransactionRequest $request,
        Transaction $transaction,
        UpdateTransaction $action,
    ): RedirectResponse {
        $action->handle($transaction, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.transaction.updated')]);

        return back();
    }

    /**
     * Remove the specified transaction from storage.
     *
     * @param Request $request The incoming request.
     * @param Transaction $transaction The transaction model to be deleted.
     * @param DeleteTransaction $action The action to delete the transaction.
     *
     * @return RedirectResponse A redirect response back to the previous page with a success message or error.
     */
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
