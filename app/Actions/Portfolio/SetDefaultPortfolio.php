<?php

declare(strict_types=1);

namespace App\Actions\Portfolio;

use App\Models\Portfolio;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SetDefaultPortfolio
{
    /**
     * Sets the specified portfolio as the default for the given user. It ensures that only one portfolio is marked as default at any time by updating the user's portfolios within a database transaction.
     *
     * @param User $user The user for whom to set the default portfolio.
     * @param Portfolio $portfolio The portfolio to be set as the default.
     *
     * @return void
     */
    public function handle(User $user, Portfolio $portfolio): void
    {
        DB::transaction(function () use ($user, $portfolio): void {
            User::query()->whereKey($user->getKey())->lockForUpdate()->firstOrFail();
            $user->portfolios()->update(['is_default' => false]);
            $portfolio->update(['is_default' => true]);
        });
    }
}
