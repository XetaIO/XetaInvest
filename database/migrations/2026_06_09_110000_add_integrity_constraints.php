<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class () extends Migration {
    public function up(): void
    {
        Schema::table('portfolios', function (Blueprint $table): void {
            $table->unique(['user_id', 'name']);
        });

        Schema::table('ai_reports', function (Blueprint $table): void {
            $table->dropUnique('ai_reports_unique_per_day');
        });

        DB::statement(
            'CREATE UNIQUE INDEX portfolios_one_default_per_user
             ON portfolios (user_id)
             WHERE is_default = true'
        );
        DB::statement(
            'CREATE UNIQUE INDEX ai_reports_unique_unscoped_per_day
             ON ai_reports (user_id, type, generated_for_date)
             WHERE scope_type IS NULL AND scope_id IS NULL'
        );
        DB::statement(
            'CREATE UNIQUE INDEX ai_reports_unique_scoped_per_day
             ON ai_reports (user_id, type, scope_type, scope_id, generated_for_date)
             WHERE scope_type IS NOT NULL AND scope_id IS NOT NULL'
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS ai_reports_unique_scoped_per_day');
        DB::statement('DROP INDEX IF EXISTS ai_reports_unique_unscoped_per_day');
        DB::statement('DROP INDEX IF EXISTS portfolios_one_default_per_user');

        Schema::table('ai_reports', function (Blueprint $table): void {
            $table->unique(
                ['user_id', 'type', 'scope_type', 'scope_id', 'generated_for_date'],
                'ai_reports_unique_per_day',
            );
        });

        Schema::table('portfolios', function (Blueprint $table): void {
            $table->dropUnique(['user_id', 'name']);
        });
    }
};
