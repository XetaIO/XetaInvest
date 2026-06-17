<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Portfolio\CreatePortfolio;
use App\Actions\Portfolio\DeletePortfolio;
use App\Actions\Portfolio\SetDefaultPortfolio;
use App\Actions\Portfolio\UpdatePortfolio;
use App\Http\Requests\Portfolio\DeletePortfolioRequest;
use App\Http\Requests\Portfolio\SetDefaultPortfolioRequest;
use App\Http\Requests\Portfolio\StorePortfolioRequest;
use App\Http\Requests\Portfolio\UpdatePortfolioRequest;
use App\Models\Portfolio;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class PortfolioController extends Controller
{
    /**
     * Store a newly created portfolio in storage.
     *
     * @param StorePortfolioRequest $request The validated request containing the new portfolio data.
     * @param CreatePortfolio $action The action to create a new portfolio.
     *
     * @return RedirectResponse A redirect response back to the previous page with a success message.
     */
    public function store(StorePortfolioRequest $request, CreatePortfolio $action): RedirectResponse
    {
        $action->handle($request->user(), $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.portfolio.created')]);

        return back();
    }

    /**
     * Update the specified portfolio in storage.
     *
     * @param UpdatePortfolioRequest $request The validated request containing the updated portfolio data.
     * @param Portfolio $portfolio The portfolio model to be updated.
     * @param UpdatePortfolio $action The action to update the portfolio.
     *
     * @return RedirectResponse A redirect response back to the previous page with a success message.
     */
    public function update(UpdatePortfolioRequest $request, Portfolio $portfolio, UpdatePortfolio $action): RedirectResponse
    {
        $action->handle($request->user(), $portfolio, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.portfolio.updated')]);

        return back();
    }

    public function destroy(
        DeletePortfolioRequest $request,
        Portfolio $portfolio,
        DeletePortfolio $action,
    ): RedirectResponse {
        $action->handle($request->user(), $portfolio);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.portfolio.deleted')]);

        return back();
    }

    /**
     * Set the specified portfolio as the default for the authenticated user.
     *
     * @param Request $request The incoming HTTP request.
     * @param Portfolio $portfolio The portfolio model to be set as default.
     * @param SetDefaultPortfolio $action The action to set the default portfolio.
     *
     * @return RedirectResponse A redirect response back to the previous page with a success message.
     */
    public function setDefault(
        SetDefaultPortfolioRequest $request,
        Portfolio $portfolio,
        SetDefaultPortfolio $action,
    ): RedirectResponse {
        $action->handle($request->user(), $portfolio);

        return back();
    }
}
