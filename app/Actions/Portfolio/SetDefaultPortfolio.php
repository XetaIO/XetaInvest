<?php

declare(strict_types=1);

namespace App\Actions\Portfolio;

use App\Models\Portfolio;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SetDefaultPortfolio
{
    public function handle(User $user, Portfolio $portfolio): void
    {
        DB::transaction(function () use ($user, $portfolio): void {
            User::query()->whereKey($user->getKey())->lockForUpdate()->firstOrFail();
            $user->portfolios()->update(['is_default' => false]);
            $portfolio->update(['is_default' => true]);
        });
    }
}
