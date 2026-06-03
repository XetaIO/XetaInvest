<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\PortfolioSnapshotFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'portfolio_id',
    'captured_on',
    'invested_eur',
    'current_value_eur',
    'pnl_eur',
    'position_count',
    'quote_error',
])]
class PortfolioSnapshot extends Model
{
    /** @use HasFactory<PortfolioSnapshotFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'captured_on' => 'date:Y-m-d',
            'invested_eur' => 'decimal:4',
            'current_value_eur' => 'decimal:4',
            'pnl_eur' => 'decimal:4',
            'position_count' => 'integer',
            'quote_error' => 'boolean',
        ];
    }

    public function portfolio(): BelongsTo
    {
        return $this->belongsTo(Portfolio::class);
    }
}
