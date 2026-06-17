<?php

declare(strict_types=1);

namespace App\Http\Requests\WatchlistItem;

use Illuminate\Foundation\Http\FormRequest;

class DeleteWatchlistItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('delete', $this->route('item')) ?? false;
    }

    public function rules(): array
    {
        return [];
    }
}
