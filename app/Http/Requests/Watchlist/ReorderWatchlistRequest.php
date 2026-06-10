<?php

declare(strict_types=1);

namespace App\Http\Requests\Watchlist;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ReorderWatchlistRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('watchlist')) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'item_ids' => ['required', 'array'],
            'item_ids.*' => [
                'required',
                'string',
                'uuid',
                'distinct',
                Rule::exists('watchlist_items', 'id')
                    ->where('watchlist_id', $this->route('watchlist')?->getKey()),
            ],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $watchlist = $this->route('watchlist');
            $ids = $this->input('item_ids', []);

            if (
                $watchlist !== null
                && is_array($ids)
                && count($ids) !== $watchlist->items()->count()
            ) {
                $validator->errors()->add('item_ids', __('messages.watchlist.invalid_order'));
            }
        });
    }
}
