<?php

declare(strict_types=1);

namespace App\Services\Ai\DataTransferObjects;

final readonly class AiQuotaReservation
{
    /** @param array<int, string> $scopeKeys */
    public function __construct(
        public string $date,
        public array $scopeKeys,
        public int $tokens,
    ) {
    }
}
