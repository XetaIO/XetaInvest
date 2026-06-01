<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;

class LocaleController extends Controller
{
    /** @var array<string> */
    private const array SUPPORTED = ['fr', 'en'];

    public function update(Request $request): RedirectResponse
    {
        $locale = $request->input('locale');

        if (! in_array($locale, self::SUPPORTED, strict: true)) {
            return back()->withErrors(['locale' => __('messages.locale.invalid')]);
        }

        $request->user()->update(['locale' => $locale]);

        Cookie::queue('locale', $locale, 60 * 24 * 365);

        return back();
    }
}
