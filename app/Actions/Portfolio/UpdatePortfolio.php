<?php

declare(strict_types=1);

namespace App\Actions\Portfolio;

use App\Models\Portfolio;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class UpdatePortfolio
{
    /**
     * Updates the specified portfolio for the given user with the provided data.
     *
     * @param User $user The user for whom the portfolio is being updated.
     * @param Portfolio $portfolio The portfolio to be updated.
     * @param array $data The data for updating the portfolio.
     *
     * @return Portfolio The updated portfolio instance.
     */
    public function handle(User $user, Portfolio $portfolio, array $data): Portfolio
    {
        $isDefault = (bool) ($data['is_default'] ?? $portfolio->is_default);

        DB::transaction(function () use ($user, $portfolio, $data, $isDefault): void {
            User::query()->whereKey($user->getKey())->lockForUpdate()->firstOrFail();

            if ($isDefault && ! $portfolio->is_default) {
                $user->portfolios()->update(['is_default' => false]);
            }

            $portfolio->update([
                'name' => $data['name'],
                'is_default' => $isDefault,
            ]);
        });

        return $portfolio->fresh();
    }
}
