<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class QuotesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'symbols' => ['required', 'string', 'max:600'],
            'refresh' => ['sometimes', 'boolean'],
        ];
    }
}
