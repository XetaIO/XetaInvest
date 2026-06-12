<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\WatchlistFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'name', 'position'])]
class Watchlist extends Model
{
    /** @use HasFactory<WatchlistFactory> */
    use HasFactory;

    use HasUuids;

    public const MAX_PER_USER = 10;

    public const MAX_ITEMS = 25;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(WatchlistItem::class)->orderBy('position');
    }

    public function sections(): HasMany
    {
        return $this->hasMany(WatchlistSection::class)->orderBy('position');
    }
}
