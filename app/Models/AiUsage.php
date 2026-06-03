<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'provider',
    'model',
    'purpose',
    'prompt_tokens',
    'completion_tokens',
    'cost_estimate',
])]
class AiUsage extends Model
{
    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'cost_estimate' => 'decimal:6',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
