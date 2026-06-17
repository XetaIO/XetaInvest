<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class () extends Migration {
    public function up(): void
    {
        Schema::create('watchlist_sections', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('watchlist_id');
            $table->foreign('watchlist_id')->references('id')->on('watchlists')->cascadeOnDelete();
            $table->string('name', 60);
            $table->unsignedInteger('position')->default(0);
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->unique(['watchlist_id', 'name']);
            $table->unique(['id', 'watchlist_id']);
            $table->index(['watchlist_id', 'position']);
        });

        DB::statement(
            'CREATE UNIQUE INDEX watchlist_sections_one_default
             ON watchlist_sections (watchlist_id)
             WHERE is_default = true'
        );

        Schema::table('watchlist_items', function (Blueprint $table): void {
            $table->uuid('section_id')->nullable();
        });

        $now = now();

        DB::table('watchlists')
            ->select(['id'])
            ->orderBy('id')
            ->each(function (object $watchlist) use ($now): void {
                $sectionId = (string) Str::uuid();

                DB::table('watchlist_sections')->insert([
                    'id' => $sectionId,
                    'watchlist_id' => $watchlist->id,
                    'name' => 'Général',
                    'position' => 0,
                    'is_default' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                DB::table('watchlist_items')
                    ->where('watchlist_id', $watchlist->id)
                    ->update(['section_id' => $sectionId]);
            });

        Schema::table('watchlist_items', function (Blueprint $table): void {
            $table->uuid('section_id')->nullable(false)->change();
            $table->foreign(['section_id', 'watchlist_id'])
                ->references(['id', 'watchlist_id'])
                ->on('watchlist_sections')
                ->cascadeOnDelete();
            $table->index(['section_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::table('watchlist_items', function (Blueprint $table): void {
            $table->dropForeign(['section_id', 'watchlist_id']);
            $table->dropIndex(['section_id', 'position']);
            $table->dropColumn('section_id');
        });

        DB::statement('DROP INDEX IF EXISTS watchlist_sections_one_default');
        Schema::dropIfExists('watchlist_sections');
    }
};
