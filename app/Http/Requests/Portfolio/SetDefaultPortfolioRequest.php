<?php

declare(strict_types=1);

namespace App\Http\Requests\Portfolio;

use Illuminate\Foundation\Http\FormRequest;

class SetDefaultPortfolioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('portfolio')) ?? false;
    }

    public function rules(): array
    {
        return [];
    }
}
