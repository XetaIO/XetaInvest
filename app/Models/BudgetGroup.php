<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BudgetGroupType;
use Database\Factories\BudgetGroupFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['budget_id', 'type', 'name', 'sort_order'])]
class BudgetGroup extends Model
{
    /** @use HasFactory<BudgetGroupFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'type' => BudgetGroupType::class,
        ];
    }

    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(BudgetLine::class)->orderBy('sort_order');
    }
}
