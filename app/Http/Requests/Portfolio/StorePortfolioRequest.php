<?php

declare(strict_types=1);

namespace App\Http\Requests\Portfolio;

use App\Models\Portfolio;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePortfolioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Portfolio::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('portfolios', 'name')->where(fn ($q) => $q->where('user_id', $this->user()->id)),
            ],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}
