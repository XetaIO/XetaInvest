<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portfolio_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('portfolio_id')->constrained()->cascadeOnDelete();
            $table->date('captured_on');
            $table->decimal('invested_eur', 18, 4);
            $table->decimal('current_value_eur', 18, 4);
            $table->decimal('pnl_eur', 18, 4);
            $table->unsignedSmallInteger('position_count')->default(0);
            $table->boolean('quote_error')->default(false);
            $table->timestamps();

            $table->unique(['portfolio_id', 'captured_on']);
            $table->index('captured_on');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portfolio_snapshots');
    }
};
