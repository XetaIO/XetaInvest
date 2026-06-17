<?php

declare(strict_types=1);

namespace App\Http\Requests\WatchlistItem;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWatchlistItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        $watchlist = $this->route('watchlist');

        return $watchlist !== null && $this->user()?->can('update', $watchlist);
    }

    public function rules(): array
    {
        return [
            'symbol' => ['required', 'string', 'max:32'],
            'section_id' => [
                'required',
                'uuid',
                Rule::exists('watchlist_sections', 'id')
                    ->where('watchlist_id', $this->route('watchlist')?->getKey()),
            ],
        ];
    }
}
