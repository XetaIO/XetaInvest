<?php

declare(strict_types=1);

namespace App\Services\Ai;

use App\Services\Ai\Contracts\AiProvider;
use App\Services\Ai\Exceptions\AiException;
use App\Services\Ai\Providers\OpenAiProvider;

class AiManager
{
    /** @var array<string, AiProvider> */
    protected array $providers = [];

    public function driver(?string $name = null): AiProvider
    {
        $name ??= (string) config('ai.default');

        return $this->providers[$name] ??= $this->resolve($name);
    }

    protected function resolve(string $name): AiProvider
    {
        $config = config('ai.providers.'.$name);

        if (! is_array($config)) {
            throw new AiException(sprintf('AI provider [%s] is not configured.', $name));
        }

        $driver = (string) ($config['driver'] ?? $name);

        return match ($driver) {
            'openai' => new OpenAiProvider($config),
            default => throw new AiException(sprintf('Unknown AI driver [%s].', $driver)),
        };
    }
}
