<?php

declare(strict_types=1);

use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as RouteFacade;

test('application routes do not require email verification', function (): void {
    $verifiedRoutes = collect(RouteFacade::getRoutes()->getRoutes())
        ->filter(
            static fn (Route $route): bool => in_array('verified', $route->gatherMiddleware(), true),
        )
        ->map(static fn (Route $route): string => $route->uri())
        ->values()
        ->all();

    expect($verifiedRoutes)->toBeEmpty();
});
