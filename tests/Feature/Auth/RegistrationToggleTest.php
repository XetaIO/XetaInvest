<?php

declare(strict_types=1);

use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;

test('registration_enabled config key is a boolean', function () {
    expect(config('fortify.registration_enabled'))->toBeBool();
});

test('login page shares registrationEnabled prop as true when enabled', function () {
    config(['fortify.registration_enabled' => true]);

    $this->get(route('login'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/login')
            ->where('registrationEnabled', true)
        );
});

test('login page shares registrationEnabled prop as false when disabled', function () {
    config(['fortify.registration_enabled' => false]);

    $this->get(route('login'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/login')
            ->where('registrationEnabled', false)
        );
});

test('register feature is included when REGISTRATION_ENABLED env var is true', function () {
    $features = array_filter([
        env('REGISTRATION_ENABLED', true) ? Features::registration() : null,
    ]);

    expect($features)->toContain('registration');
})->skip(fn () => env('REGISTRATION_ENABLED') === false, 'REGISTRATION_ENABLED is disabled in env.');

test('register feature is excluded when REGISTRATION_ENABLED env var is false', function () {
    $registrationEnabled = false;

    $features = array_filter([
        $registrationEnabled ? Features::registration() : null,
    ]);

    expect($features)->not->toContain('registration');
});
