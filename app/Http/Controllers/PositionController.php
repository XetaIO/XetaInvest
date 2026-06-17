<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Position\CreatePosition;
use App\Actions\Position\DeletePosition;
use App\Http\Requests\Position\StorePositionRequest;
use App\Models\Portfolio;
use App\Models\Position;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PositionController extends Controller
{
    /**
     * Store a newly created position in storage.
     *
     * @param StorePositionRequest $request The validated request containing the new position data.
     * @param Portfolio $portfolio The portfolio model to which the position will be added.
     * @param CreatePosition $action The action to create a new position.
     *
     * @return RedirectResponse A redirect response back to the previous page with a success message or error.
     */
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

    /**
     * Remove the specified position from storage.
     *
     * @param Request $request The incoming HTTP request.
     * @param Position $position The position model to be deleted.
     * @param DeletePosition $action The action to delete the position.
     *
     * @return RedirectResponse A redirect response back to the previous page with a success message.
     */
    public function destroy(
        Request $request,
        Position $position,
        DeletePosition $action,
    ): RedirectResponse {
        $this->authorize('delete', $position);
        $action->handle($position);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.position.deleted')]);

        return back();
    }
}
