<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the form for editing the user's profile.
     *
     * @param Request $request The incoming HTTP request.
     *
     * @return Response An Inertia response rendering the profile edit page with necessary data.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     *
     * @param ProfileUpdateRequest $request The validated request containing the updated profile data.
     *
     * @return RedirectResponse A redirect response back to the profile edit page.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.profile.updated')]);

        return to_route('profile.edit');
    }

    /**
     * Delete the user's profile.
     *
     * @param ProfileDeleteRequest $request The validated request containing the deletion confirmation.
     *
     * @return RedirectResponse A redirect response back to the home page.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $user = $request->user();

            Auth::logout();

            $user->delete();

            $request->session()->invalidate();
            $request->session()->regenerateToken();
        });

        return redirect('/');
    }
}
