<?php

declare(strict_types=1);

namespace App\Actions\Ai;

use App\Models\AiChatSession;
use App\Models\User;

class CreateChatSession
{
    public function handle(User $user, ?string $title): AiChatSession
    {
        return AiChatSession::query()->create([
            'user_id' => $user->id,
            'title' => $title,
            'last_message_at' => now(),
        ]);
    }
}
