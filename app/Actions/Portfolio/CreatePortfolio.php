<?php

declare(strict_types=1);

namespace App\Actions\Portfolio;

use App\Models\Portfolio;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CreatePortfolio
{
    /** @param array<string, mixed> $data */
    public function handle(User $user, array $data): Portfolio
    {
        $isDefault = (bool) ($data['is_default'] ?? false);
        $count = $user->portfolios()->count();

        return DB::transaction(function () use ($user, $data, $isDefault, $count): Portfolio {
            if ($isDefault || $count === 0) {
                $user->portfolios()->update(['is_default' => false]);
            }

            return $user->portfolios()->create([
                'name' => $data['name'],
                'is_default' => $isDefault || $count === 0,
            ]);
        });
    }
}
