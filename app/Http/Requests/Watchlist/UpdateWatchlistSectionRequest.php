<?php

declare(strict_types=1);

namespace App\Http\Requests\Watchlist;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWatchlistSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('section')) ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $section = $this->route('section');

        return [
            'name' => [
                'required',
                'string',
                'max:60',
                Rule::unique('watchlist_sections', 'name')
                    ->where(fn ($query) => $query->where('watchlist_id', $section?->watchlist_id))
                    ->ignore($section?->getKey()),
            ],
        ];
    }
}
