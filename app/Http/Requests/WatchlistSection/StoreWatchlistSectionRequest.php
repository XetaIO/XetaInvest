<?php

declare(strict_types=1);

namespace App\Http\Requests\WatchlistSection;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWatchlistSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('watchlist')) ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:60',
                Rule::unique('watchlist_sections', 'name')
                    ->where(fn ($query) => $query->where('watchlist_id', $this->route('watchlist')?->getKey())),
            ],
        ];
    }
}
