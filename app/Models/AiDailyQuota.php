<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'quota_date',
    'scope_key',
    'consumed_tokens',
    'reserved_tokens',
])]
class AiDailyQuota extends Model
{
    protected function casts(): array
    {
        return [
            'quota_date' => 'date',
            'consumed_tokens' => 'integer',
            'reserved_tokens' => 'integer',
        ];
    }
}
