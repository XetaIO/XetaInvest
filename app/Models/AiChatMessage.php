<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AiChatRole;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'session_id',
    'role',
    'content',
    'tool_calls',
    'tool_call_id',
    'tool_name',
    'prompt_tokens',
    'completion_tokens',
])]
class AiChatMessage extends Model
{
    protected function casts(): array
    {
        return [
            'role' => AiChatRole::class,
            'tool_calls' => 'array',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(AiChatSession::class, 'session_id');
    }
}
