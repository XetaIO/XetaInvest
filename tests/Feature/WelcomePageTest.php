<?php

declare(strict_types=1);

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guest sees the public landing page', function (): void {
    config(['fortify.registration_enabled' => true]);

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(
            fn (Assert $page) => $page
            ->component('welcome')
            ->where('registrationEnabled', true)
        );
});

test('landing page reflects closed registration', function (): void {
    config(['fortify.registration_enabled' => false]);

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(
            fn (Assert $page) => $page
            ->component('welcome')
            ->where('registrationEnabled', false)
        );
});

test('authenticated user is redirected from home to dashboard', function (): void {
    $this->actingAs(User::factory()->create())
        ->get(route('home'))
        ->assertRedirect(route('dashboard'));
});
