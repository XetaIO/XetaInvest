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

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $watchlistId = $this->route('watchlist')?->getKey();

        return [
            'sections' => ['required', 'array', 'min:1'],
            'sections.*.id' => [
                'required',
                'uuid',
                'distinct',
                Rule::exists('watchlist_sections', 'id')->where('watchlist_id', $watchlistId),
            ],
            'sections.*.item_ids' => ['required', 'array'],
            'sections.*.item_ids.*' => [
                'required',
                'uuid',
                Rule::exists('watchlist_items', 'id')->where('watchlist_id', $watchlistId),
            ],
        ];
    }

    /**
     * Configure the validator instance to perform additional checks after the initial validation rules have been applied. This method ensures that the provided sections and item IDs match the existing structure of the watchlist, preventing inconsistencies in the layout.
     *
     * @param Validator $validator
     *
     * @return void
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $watchlist = $this->route('watchlist');
            $sections = $this->input('sections', []);

            if ($watchlist === null || ! is_array($sections)) {
                return;
            }

            $sectionIds = collect($sections)->pluck('id');
            $itemIds = collect($sections)
                ->flatMap(fn ($section) => is_array($section) ? ($section['item_ids'] ?? []) : [])
                ->values();

            if ($sectionIds->count() !== $watchlist->sections()->count()) {
                $validator->errors()->add('sections', __('messages.watchlist.invalid_layout'));
            }

            if (
                $itemIds->count() !== $watchlist->items()->count()
                || $itemIds->unique()->count() !== $itemIds->count()
            ) {
                $validator->errors()->add('sections', __('messages.watchlist.invalid_layout'));
            }
        });
    }
}
