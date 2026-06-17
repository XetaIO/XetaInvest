<?php

declare(strict_types=1);

namespace App\Actions\Ai;

use App\Models\AiChatSession;
use App\Models\User;

class CreateChatSession
{
    /**
     * Create a new chat session for the given user with an optional title.
     *
     * @param User $user The user for whom the chat session is being created.
     * @param mixed $title The title of the chat session, can be null.
     *
     * @return AiChatSession The newly created chat session instance.
     */
    public function handle(User $user, ?string $title): AiChatSession
    {
        return AiChatSession::query()->create([
            'user_id' => $user->id,
            'title' => $title,
            'last_message_at' => now(),
        ]);
    }
}
