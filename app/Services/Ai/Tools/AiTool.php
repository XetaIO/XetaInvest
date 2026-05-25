<?php

declare(strict_types=1);

namespace App\Services\Ai\Tools;

use App\Models\User;

interface AiTool
{
    public function name(): string;

    public function description(): string;

    /**
     * JSON schema for parameters (OpenAI function calling format).
     *
     * @return array<string, mixed>
     */
    public function schema(): array;

    /**
     * Execute the tool. Must scope everything to the given user (read-only).
     *
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function execute(User $user, array $args): array;
}
