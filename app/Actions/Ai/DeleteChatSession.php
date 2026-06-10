<?php

declare(strict_types=1);

namespace App\Actions\Ai;

use App\Models\AiChatSession;

class DeleteChatSession
{
    public function handle(AiChatSession $session): void
    {
        $session->delete();
    }
}
