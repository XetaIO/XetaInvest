<?php

namespace App\Policies;

use App\Models\AiChatSession;
use App\Models\User;

class AiChatSessionPolicy
{
    public function view(User $user, AiChatSession $session): bool
    {
        return $session->user_id === $user->id;
    }

    public function update(User $user, AiChatSession $session): bool
    {
        return $session->user_id === $user->id;
    }

    public function delete(User $user, AiChatSession $session): bool
    {
        return $session->user_id === $user->id;
    }
}
