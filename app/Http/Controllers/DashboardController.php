<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\BuildDashboardPageData;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function show(Request $request, BuildDashboardPageData $builder): Response
    {
        return Inertia::render('dashboard', $builder->build($request->user(), $request));
    }
}
