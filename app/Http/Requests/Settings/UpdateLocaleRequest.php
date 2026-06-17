<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLocaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'locale' => ['required', 'string', Rule::in(['fr', 'en'])],
        ];
    }

    public function messages(): array
    {
        return [
            'locale.in' => __('messages.locale.invalid'),
        ];
    }
}
