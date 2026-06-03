<?php

declare(strict_types=1);

namespace App\Http\Requests\Watchlist;

use Illuminate\Foundation\Http\FormRequest;

class StoreWatchlistItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        $watchlist = $this->route('watchlist');

        return $watchlist !== null && $this->user()?->can('update', $watchlist);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'symbol' => ['required', 'string', 'max:32'],
        ];
    }
}
