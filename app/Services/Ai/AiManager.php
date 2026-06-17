<?php

declare(strict_types=1);

namespace App\Services\Ai;

use App\Services\Ai\Contracts\AiProvider;
use App\Services\Ai\Exceptions\AiException;
use App\Services\Ai\Providers\OpenAiProvider;
use Illuminate\Contracts\Container\Container;

class AiManager
{
    /** @var array<string, AiProvider> */
    protected array $providers = [];

    public function __construct(private readonly Container $container)
    {
    }

    /**
     * Get the AI provider instance by name. If no name is provided, the default provider is used.
     *
     * @param string|null $name The name of the AI provider to retrieve. If null, the default provider is used.
     *
     * @return AiProvider The AI provider instance.
     *
     * @throws AiException If the specified provider is not configured or unknown.
     */
    public function driver(?string $name = null): AiProvider
    {
        $name ??= (string) config('ai.default');

        return $this->providers[$name] ??= $this->resolve($name);
    }

    /**
     * Resolve the AI provider instance by name. This method is responsible for creating the provider instance based on the configuration.
     *
     * @param string $name The name of the AI provider to resolve.
     *
     * @return AiProvider The resolved AI provider instance.
     *
     * @throws AiException If the specified provider is not configured or unknown.
     */
    protected function resolve(string $name): AiProvider
    {
        $config = config('ai.providers.'.$name);

        if (! is_array($config)) {
            throw new AiException(sprintf('AI provider [%s] is not configured.', $name));
        }

        $driver = (string) ($config['driver'] ?? $name);

        return match ($driver) {
            'openai' => $this->container->make(OpenAiProvider::class, ['config' => $config]),
            default => throw new AiException(sprintf('Unknown AI driver [%s].', $driver)),
        };
    }
}
