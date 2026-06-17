<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateLocaleRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cookie;

class LocaleController extends Controller
{
    /**
     * Update the user's preferred locale and set a cookie for future requests.
     *
     * @param  UpdateLocaleRequest  $request  The validated request containing the new locale.
     * @return RedirectResponse A redirect response back to the previous page.
     */
    public function update(UpdateLocaleRequest $request): RedirectResponse
    {
        $locale = $request->validated('locale');

        $request->user()?->update(['locale' => $locale]);

        Cookie::queue('locale', $locale, 60 * 24 * 365);

        return back();
    }
}
