<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Models\WatchlistItem;

class WatchlistItemPolicy
{
    public function delete(User $user, WatchlistItem $item): bool
    {
        return $item->watchlist()->where('user_id', $user->id)->exists();
    }
}
