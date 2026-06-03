<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

class HandleAppearance
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $raw = $request->cookie('appearance');
        $appearance = in_array($raw, ['light', 'dark', 'system'], true) ? $raw : 'system';

        View::share('appearance', $appearance);

        return $next($request);
    }
}
