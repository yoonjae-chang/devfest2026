# Supabase Migrations

This directory contains database migration files for the music composition application.

## Migration Files

1. **20240101000000_create_composition_plans.sql**
   - Creates the `composition_plans` table
   - Stores composition plans generated from user prompts
   - Supports customization iterations via `better_than_id` foreign key

2. **20240101000001_create_final_compositions.sql**
   - Creates the `final_compositions` table
   - Stores final generated music compositions
   - Links to composition plans via foreign key

## Running Migrations

### Local Development (Supabase CLI)

If you're using Supabase CLI for local development:

```bash
# Start Supabase locally
supabase start

# Apply migrations
supabase db reset

# Or apply specific migration
supabase migration up
```

### Remote Database

For remote Supabase projects:

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Push migrations to remote
supabase db push
```

### Manual Application

You can also apply these migrations manually through the Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of each migration file in order
4. Execute each migration

## Table Schemas

### composition_plans

- `id` (BIGSERIAL PRIMARY KEY) - Auto-incrementing ID
- `user_id` (TEXT) - User identifier
- `run_id` (TEXT) - Workflow/session identifier
- `user_prompt` (TEXT) - Original user prompt
- `user_styles` (TEXT[]) - Array of user-provided styles
- `lyrics_exists` (BOOLEAN) - Whether lyrics were included
- `composition_plan` (JSONB) - The composition plan JSON object
- `better_than_id` (BIGINT, nullable) - Reference to improved composition plan
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

### final_compositions

- `id` (BIGSERIAL PRIMARY KEY) - Auto-incrementing ID
- `user_id` (TEXT) - User identifier
- `run_id` (TEXT) - Workflow/session identifier
- `composition_plan_id` (BIGINT) - Foreign key to composition_plans
- `audio_path` (TEXT) - Local file path to audio file
- `audio_filename` (TEXT) - Audio filename
- `track_metadata` (JSONB, nullable) - Track metadata JSON
- `created_at` (TIMESTAMPTZ) - Creation timestamp

## Indexes

Both tables have indexes on:
- `user_id` - For querying by user
- `run_id` - For querying by workflow session
- `created_at` - For time-based queries
- Foreign key columns - For join performance

## Notes

- The `composition_plans` table has a self-referential foreign key (`better_than_id`) to track customization iterations
- The `updated_at` column in `composition_plans` is automatically updated via a trigger
- Foreign keys use `ON DELETE CASCADE` or `ON DELETE SET NULL` as appropriate
