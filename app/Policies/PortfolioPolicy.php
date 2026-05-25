<?php

namespace App\Policies;

use App\Models\Portfolio;
use App\Models\User;

class PortfolioPolicy
{
    public function view(User $user, Portfolio $portfolio): bool
    {
        return $portfolio->user_id === $user->id;
    }

    public function update(User $user, Portfolio $portfolio): bool
    {
        return $portfolio->user_id === $user->id;
    }

    public function delete(User $user, Portfolio $portfolio): bool
    {
        return $portfolio->user_id === $user->id;
    }
}
