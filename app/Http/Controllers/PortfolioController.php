<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Portfolio\StorePortfolioRequest;
use App\Http\Requests\Portfolio\UpdatePortfolioRequest;
use App\Models\Portfolio;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PortfolioController extends Controller
{
    public function store(StorePortfolioRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $isDefault = (bool) ($data['is_default'] ?? false);
        $count = $request->user()->portfolios()->count();

        DB::transaction(function () use ($request, $data, $isDefault, $count): void {
            if ($isDefault || $count === 0) {
                $request->user()->portfolios()->update(['is_default' => false]);
            }

            $request->user()->portfolios()->create([
                'name' => $data['name'],
                'is_default' => $isDefault || $count === 0,
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Portefeuille créé.')]);

        return back();
    }

    public function update(UpdatePortfolioRequest $request, Portfolio $portfolio): RedirectResponse
    {
        $data = $request->validated();
        $isDefault = (bool) ($data['is_default'] ?? $portfolio->is_default);

        DB::transaction(function () use ($request, $portfolio, $data, $isDefault): void {
            if ($isDefault && ! $portfolio->is_default) {
                $request->user()->portfolios()->update(['is_default' => false]);
            }

            $portfolio->update([
                'name' => $data['name'],
                'is_default' => $isDefault,
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Portefeuille mis à jour.')]);

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

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Portefeuille supprimé.')]);

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
