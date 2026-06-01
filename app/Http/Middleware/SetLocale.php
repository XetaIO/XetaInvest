<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /** @var array<string> */
    private const array SUPPORTED = ['fr', 'en'];

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->resolveLocale($request);

        App::setLocale($locale);

        return $next($request);
    }

    private function resolveLocale(Request $request): string
    {
        // 1. Authenticated user preference
        if ($request->user() && in_array($request->user()->locale, self::SUPPORTED, strict: true)) {
            return $request->user()->locale;
        }

        // 2. Cookie (guest)
        $cookie = $request->cookie('locale');
        if (is_string($cookie) && in_array($cookie, self::SUPPORTED, strict: true)) {
            return $cookie;
        }

        // 3. Default
        return 'fr';
    }
}
