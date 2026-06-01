<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Transaction\StoreTransactionRequest;
use App\Http\Requests\Transaction\UpdateTransactionRequest;
use App\Models\Position;
use App\Models\Transaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TransactionController extends Controller
{
    public function store(StoreTransactionRequest $request, Position $position): RedirectResponse
    {
        $position->transactions()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.transaction.added')]);

        return back();
    }

    public function update(UpdateTransactionRequest $request, Transaction $transaction): RedirectResponse
    {
        $transaction->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.transaction.updated')]);

        return back();
    }

    public function destroy(Request $request, Transaction $transaction): RedirectResponse
    {
        $this->authorize('delete', $transaction);

        $transaction->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.transaction.deleted')]);

        return back();
    }
}
