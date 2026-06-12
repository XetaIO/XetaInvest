<?php

declare(strict_types=1);

namespace App\Actions\Watchlist;

use App\Models\User;
use App\Models\Watchlist;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateWatchlist
{
    public function handle(User $user, string $name): Watchlist
    {
        return DB::transaction(function () use ($user, $name): Watchlist {
            User::query()->whereKey($user->getKey())->lockForUpdate()->firstOrFail();

            if ($user->watchlists()->count() >= Watchlist::MAX_PER_USER) {
                throw ValidationException::withMessages([
                    'name' => __('messages.watchlist.limit_reached'),
                ]);
            }

            $watchlist = $user->watchlists()->create([
                'name' => $name,
                'position' => (int) $user->watchlists()->max('position') + 1,
            ]);

            $watchlist->sections()->create([
                'name' => __('messages.watchlist.default_section'),
                'position' => 0,
                'is_default' => true,
            ]);

            return $watchlist;
        });
    }
}
