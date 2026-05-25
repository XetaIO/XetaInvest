<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Models\Watchlist;

class WatchlistPolicy
{
    public function view(User $user, Watchlist $watchlist): bool
    {
        return $watchlist->user_id === $user->id;
    }

    public function update(User $user, Watchlist $watchlist): bool
    {
        return $watchlist->user_id === $user->id;
    }

    public function delete(User $user, Watchlist $watchlist): bool
    {
        return $watchlist->user_id === $user->id;
    }
}
