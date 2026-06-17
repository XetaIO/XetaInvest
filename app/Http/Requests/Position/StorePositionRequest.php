<?php

declare(strict_types=1);

namespace App\Http\Requests\Position;

use Illuminate\Foundation\Http\FormRequest;

class StorePositionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('portfolio')) ?? false;
    }

    public function rules(): array
    {
        return [
            'symbol' => ['required', 'string', 'max:32'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0'],
            'lines.*.unit_price' => ['required', 'numeric', 'gt:0'],
            'lines.*.executed_at' => ['required', 'date', 'before_or_equal:today'],
            'lines.*.notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
