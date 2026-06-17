<?php

declare(strict_types=1);

namespace App\Http\Requests\WatchlistSection;

use Illuminate\Foundation\Http\FormRequest;

class DeleteWatchlistSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('delete', $this->route('section')) ?? false;
    }

    public function rules(): array
    {
        return [];
    }
}
