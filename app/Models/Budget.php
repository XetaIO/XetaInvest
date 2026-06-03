<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BudgetGroupType;
use Database\Factories\BudgetFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'currency'])]
class Budget extends Model
{
    /** @use HasFactory<BudgetFactory> */
    use HasFactory;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function groups(): HasMany
    {
        return $this->hasMany(BudgetGroup::class)->orderBy('sort_order');
    }

    public function groupsOfType(BudgetGroupType $type): HasMany
    {
        return $this->groups()->where('type', $type->value);
    }
}
