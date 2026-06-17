<?php

declare(strict_types=1);

namespace App\Actions\Position;

use App\Models\Position;

class DeletePosition
{
    /**
     * Deletes the specified position.
     *
     * @param Position $position The position to be deleted.
     *
     * @return void
     */
    public function handle(Position $position): void
    {
        $position->delete();
    }
}
