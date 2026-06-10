<?php

declare(strict_types=1);

namespace App\Actions\Position;

use App\Models\Position;

class DeletePosition
{
    public function handle(Position $position): void
    {
        $position->delete();
    }
}
