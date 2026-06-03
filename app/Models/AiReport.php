<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AiReportStatus;
use App\Enums\AiReportType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable([
    'user_id',
    'type',
    'scope_type',
    'scope_id',
    'generated_for_date',
    'status',
    'provider',
    'model',
    'content',
    'error_message',
    'prompt_tokens',
    'completion_tokens',
    'cost_estimate',
])]
class AiReport extends Model
{
    protected function casts(): array
    {
        return [
            'type' => AiReportType::class,
            'status' => AiReportStatus::class,
            'content' => 'array',
            'generated_for_date' => 'date',
            'cost_estimate' => 'decimal:6',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scope(): MorphTo
    {
        return $this->morphTo();
    }
}
