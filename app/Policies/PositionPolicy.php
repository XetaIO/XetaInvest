<?php

namespace App\Policies;

use App\Models\Position;
use App\Models\User;

class PositionPolicy
{
    public function view(User $user, Position $position): bool
    {
        return $position->portfolio->user_id === $user->id;
    }

    public function delete(User $user, Position $position): bool
    {
        return $position->portfolio->user_id === $user->id;
    }
}
