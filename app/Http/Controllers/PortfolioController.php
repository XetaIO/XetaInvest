<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Portfolio\CreatePortfolio;
use App\Actions\Portfolio\UpdatePortfolio;
use App\Http\Requests\Portfolio\StorePortfolioRequest;
use App\Http\Requests\Portfolio\UpdatePortfolioRequest;
use App\Models\Portfolio;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

    public function destroy(Request $request, Portfolio $portfolio): RedirectResponse
    {
        $this->authorize('delete', $portfolio);

        $wasDefault = $portfolio->is_default;
        $portfolio->delete();

        if ($wasDefault) {
            $next = $request->user()->portfolios()->orderBy('id')->first();
            $next?->update(['is_default' => true]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.portfolio.deleted')]);

        return back();
    }

    public function setDefault(Request $request, Portfolio $portfolio): RedirectResponse
    {
        $this->authorize('update', $portfolio);

        DB::transaction(function () use ($request, $portfolio): void {
            $request->user()->portfolios()->update(['is_default' => false]);
            $portfolio->update(['is_default' => true]);
        });

        return back();
    }
}
