<?php

declare(strict_types=1);

namespace App\Actions\Portfolio;

use App\Models\Portfolio;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DeletePortfolio
{
    /**
     * Deletes the specified portfolio for the given user.
     *
     * @param User $user The user for whom the portfolio is being deleted.
     * @param Portfolio $portfolio The portfolio to be deleted.
     *
     * @return void
     */
    public function handle(User $user, Portfolio $portfolio): void
    {
        DB::transaction(function () use ($user, $portfolio): void {
            User::query()->whereKey($user->getKey())->lockForUpdate()->firstOrFail();
            $wasDefault = $portfolio->is_default;

            $portfolio->delete();

            // If the deleted portfolio was the default, set the first available portfolio as the new default.
            if ($wasDefault) {
                $user->portfolios()->orderBy('id')->first()?->update(['is_default' => true]);
            }
        });
    }
}
