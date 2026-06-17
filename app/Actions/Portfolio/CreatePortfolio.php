<?php

declare(strict_types=1);

namespace App\Actions\Portfolio;

use App\Models\Portfolio;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreatePortfolio
{
    /**
     * Creates a new portfolio for the given user with the provided data. It ensures that the user does not exceed the maximum allowed portfolios and handles the default portfolio logic.
     *
     * @param User $user The user for whom the portfolio is being created.
     * @param array $data The data for the new portfolio, including its name and whether it should be the default portfolio.
     *
     * @return Portfolio The newly created portfolio instance.
     */
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
