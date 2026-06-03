<?php

declare(strict_types=1);

namespace App\Actions\Portfolio;

use App\Models\Portfolio;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class UpdatePortfolio
{
    /** @param array<string, mixed> $data */
    public function handle(User $user, Portfolio $portfolio, array $data): Portfolio
    {
        $isDefault = (bool) ($data['is_default'] ?? $portfolio->is_default);

        DB::transaction(function () use ($user, $portfolio, $data, $isDefault): void {
            if ($isDefault && ! $portfolio->is_default) {
                $user->portfolios()->update(['is_default' => false]);
            }

            $portfolio->update([
                'name' => $data['name'],
                'is_default' => $isDefault,
            ]);
        });

        return $portfolio->fresh();
    }
}
