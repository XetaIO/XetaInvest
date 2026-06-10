<?php

declare(strict_types=1);

namespace App\Actions\Portfolio;

use App\Models\Portfolio;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DeletePortfolio
{
    public function handle(User $user, Portfolio $portfolio): void
    {
        DB::transaction(function () use ($user, $portfolio): void {
            User::query()->whereKey($user->getKey())->lockForUpdate()->firstOrFail();
            $wasDefault = $portfolio->is_default;

            $portfolio->delete();

            if ($wasDefault) {
                $user->portfolios()->orderBy('id')->first()?->update(['is_default' => true]);
            }
        });
    }
}
