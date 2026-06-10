<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_daily_quotas', function (Blueprint $table): void {
            $table->id();
            $table->date('quota_date');
            $table->string('scope_key', 80);
            $table->unsignedBigInteger('consumed_tokens')->default(0);
            $table->unsignedBigInteger('reserved_tokens')->default(0);
            $table->timestamps();

            $table->unique(['quota_date', 'scope_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_daily_quotas');
    }
};
