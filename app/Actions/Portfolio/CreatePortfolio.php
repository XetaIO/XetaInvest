<?php

declare(strict_types=1);

namespace App\Actions\Portfolio;

use App\Models\Portfolio;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreatePortfolio
{
    /** @param array<string, mixed> $data */
    public function handle(User $user, array $data): Portfolio
    {
        return DB::transaction(function () use ($user, $data): Portfolio {
            User::query()->whereKey($user->getKey())->lockForUpdate()->firstOrFail();
            $count = $user->portfolios()->count();

            if ($count >= Portfolio::MAX_PER_USER) {
                throw ValidationException::withMessages([
                    'name' => __('messages.portfolio.limit_reached'),
                ]);
            }

            $isDefault = (bool) ($data['is_default'] ?? false);

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
