<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\WatchlistSectionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['watchlist_id', 'name', 'position', 'is_default'])]
class WatchlistSection extends Model
{
    /** @use HasFactory<WatchlistSectionFactory> */
    use HasFactory;

    use HasUuids;

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }

    public function watchlist(): BelongsTo
    {
        return $this->belongsTo(Watchlist::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(WatchlistItem::class, 'section_id')->orderBy('position');
    }
}
