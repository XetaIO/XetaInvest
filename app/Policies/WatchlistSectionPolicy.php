<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Models\WatchlistSection;

class WatchlistSectionPolicy
{
    public function update(User $user, WatchlistSection $section): bool
    {
        return $section->watchlist()->where('user_id', $user->id)->exists();
    }

    public function delete(User $user, WatchlistSection $section): bool
    {
        return $section->watchlist()->where('user_id', $user->id)->exists();
    }
}
