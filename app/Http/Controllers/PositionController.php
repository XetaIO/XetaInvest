<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Position\CreatePosition;
use App\Http\Requests\Position\StorePositionRequest;
use App\Models\Portfolio;
use App\Models\Position;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PositionController extends Controller
{
    public function store(
        StorePositionRequest $request,
        Portfolio $portfolio,
        CreatePosition $action,
    ): RedirectResponse {
        $position = $action->handle($portfolio, $request->validated());

        if ($position === null) {
            return back()->withErrors(['symbol' => __('messages.position.symbol_not_found')]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.position.added')]);

        return back();
    }

    public function destroy(Request $request, Position $position): RedirectResponse
    {
        $this->authorize('delete', $position);

        $position->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.position.deleted')]);

        return back();
    }
}
