<?php

declare(strict_types=1);

namespace App\Http\Requests\Position;

use Illuminate\Foundation\Http\FormRequest;

class DeletePositionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('delete', $this->route('position')) ?? false;
    }

    public function rules(): array
    {
        return [];
    }
}
