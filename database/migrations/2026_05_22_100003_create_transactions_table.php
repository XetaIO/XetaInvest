<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('position_id')->constrained()->cascadeOnDelete();
            $table->string('type', 8)->default('buy');
            $table->decimal('quantity', 20, 4);
            $table->decimal('unit_price', 20, 4);
            $table->date('executed_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['position_id', 'executed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
