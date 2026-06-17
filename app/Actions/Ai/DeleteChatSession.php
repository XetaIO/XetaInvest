<?php

declare(strict_types=1);

namespace App\Actions\Ai;

use App\Models\AiChatSession;

class DeleteChatSession
{
    /**
     * Delete the specified chat session.
     *
     * @param AiChatSession $session The chat session to be deleted.
     *
     * @return void
     */
    public function handle(AiChatSession $session): void
    {
        $session->delete();
    }
}
