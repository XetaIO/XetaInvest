<?php

declare(strict_types=1);

namespace App\Http\Requests\Ai;

use Illuminate\Foundation\Http\FormRequest;

class ShowChatMessagesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('view', $this->route('session')) ?? false;
    }

    public function rules(): array
    {
        return [];
    }
}
