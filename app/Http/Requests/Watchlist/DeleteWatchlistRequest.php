<?php

declare(strict_types=1);

namespace App\Http\Requests\Watchlist;

use Illuminate\Foundation\Http\FormRequest;

class DeleteWatchlistRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('delete', $this->route('watchlist')) ?? false;
    }

    public function rules(): array
    {
        return [];
    }
}
