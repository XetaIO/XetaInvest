<?php

declare(strict_types=1);

namespace App\Http\Requests\Watchlist;

use App\Models\Watchlist;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWatchlistRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Watchlist::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:60',
                Rule::unique('watchlists', 'name')->where(fn ($q) => $q->where('user_id', $this->user()->id)),
            ],
        ];
    }
}
