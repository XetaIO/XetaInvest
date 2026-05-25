<?php

declare(strict_types=1);

namespace App\Http\Requests\Watchlist;

use App\Models\Watchlist;
use Illuminate\Foundation\Http\FormRequest;

class StoreWatchlistItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Watchlist|null $watchlist */
        $watchlist = $this->route('watchlist');

        return $watchlist !== null
            && $this->user()?->can('update', $watchlist)
            && $watchlist->items()->count() < Watchlist::MAX_ITEMS;
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
