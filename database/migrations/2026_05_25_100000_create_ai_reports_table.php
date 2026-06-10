<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_reports', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 30);
            $table->string('scope_type', 60)->nullable();
            $table->unsignedBigInteger('scope_id')->nullable();
            $table->date('generated_for_date');
            $table->string('status', 20)->default('pending');
            $table->string('provider', 30)->nullable();
            $table->string('model', 60)->nullable();
            $table->json('content')->nullable();
            $table->text('error_message')->nullable();
            $table->unsignedInteger('prompt_tokens')->default(0);
            $table->unsignedInteger('completion_tokens')->default(0);
            $table->decimal('cost_estimate', 10, 6)->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'type', 'scope_type', 'scope_id', 'generated_for_date'], 'ai_reports_unique_per_day');
            $table->index(['user_id', 'type']);
            $table->index('generated_for_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_reports');
    }
};
