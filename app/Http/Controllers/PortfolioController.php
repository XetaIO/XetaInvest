<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Portfolio\CreatePortfolio;
use App\Actions\Portfolio\DeletePortfolio;
use App\Actions\Portfolio\SetDefaultPortfolio;
use App\Actions\Portfolio\UpdatePortfolio;
use App\Http\Requests\Portfolio\StorePortfolioRequest;
use App\Http\Requests\Portfolio\UpdatePortfolioRequest;
use App\Models\Portfolio;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PortfolioController extends Controller
{
    public function store(StorePortfolioRequest $request, CreatePortfolio $action): RedirectResponse
    {
        $action->handle($request->user(), $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.portfolio.created')]);

        return back();
    }

    public function update(UpdatePortfolioRequest $request, Portfolio $portfolio, UpdatePortfolio $action): RedirectResponse
    {
        $action->handle($request->user(), $portfolio, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.portfolio.updated')]);

        return back();
    }

    public function destroy(
        Request $request,
        Portfolio $portfolio,
        DeletePortfolio $action,
    ): RedirectResponse {
        $this->authorize('delete', $portfolio);
        $action->handle($request->user(), $portfolio);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.portfolio.deleted')]);

        return back();
    }

    public function setDefault(
        Request $request,
        Portfolio $portfolio,
        SetDefaultPortfolio $action,
    ): RedirectResponse {
        $this->authorize('update', $portfolio);
        $action->handle($request->user(), $portfolio);

        return back();
    }
}
