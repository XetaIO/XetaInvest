<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\BuildStatisticsPageData;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StatisticsController extends Controller
{
    public function show(Request $request, BuildStatisticsPageData $builder): Response
    {
        return Inertia::render('statistics', $builder->build($request->user(), $request));
    }
}
