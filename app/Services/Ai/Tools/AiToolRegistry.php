<?php

declare(strict_types=1);

namespace App\Services\Ai\Tools;

use App\Models\User;
use App\Services\Ai\Exceptions\AiException;

class AiToolRegistry
{
    /** @var array<string, AiTool> */
    protected array $tools = [];

    public function register(AiTool $tool): void
    {
        $this->tools[$tool->name()] = $tool;
    }

    /**
     * @param  array<int, AiTool>  $tools
     */
    public function registerMany(array $tools): void
    {
        foreach ($tools as $tool) {
            $this->register($tool);
        }
    }

    public function get(string $name): AiTool
    {
        if (! isset($this->tools[$name])) {
            throw new AiException(sprintf('Unknown AI tool [%s].', $name));
        }

        return $this->tools[$name];
    }

    public function has(string $name): bool
    {
        return isset($this->tools[$name]);
    }

    /**
     * Build OpenAI-compatible tool schemas for the chat completion API.
     *
     * @return array<int, array<string, mixed>>
     */
    public function schemas(): array
    {
        return array_values(array_map(static fn (AiTool $t): array => [
            'type' => 'function',
            'function' => [
                'name' => $t->name(),
                'description' => $t->description(),
                'parameters' => $t->schema(),
            ],
        ], $this->tools));
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function execute(string $name, User $user, array $args): array
    {
        return $this->get($name)->execute($user, $args);
    }

    /**
     * @return array<int, string>
     */
    public function names(): array
    {
        return array_keys($this->tools);
    }
}
