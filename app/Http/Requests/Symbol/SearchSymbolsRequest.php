<?php

declare(strict_types=1);

namespace App\Http\Requests\Symbol;

use Illuminate\Foundation\Http\FormRequest;

class SearchSymbolsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:64'],
        ];
    }
}
