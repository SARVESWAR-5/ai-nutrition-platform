-- ==============================================================================
-- PERSONAL AI NUTRITION PLATFORM — LIVE MULTI-DEVICE CLOUD SYNC SCHEMA
-- Enables cross-device sync for Sarveswar, Admin, Krishna, and all new users.
-- Compatible with Supabase PostgreSQL & PostgREST REST API
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Platform User Accounts (Cloud Registry for Multi-Device Login)
CREATE TABLE IF NOT EXISTS public.platform_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_onboarded BOOLEAN DEFAULT false,
    daily_email_report_enabled BOOLEAN DEFAULT true,
    active_streak_days INTEGER DEFAULT 0,
    total_food_logs INTEGER DEFAULT 0,
    usage_timing_habit TEXT DEFAULT 'Active Tracking',
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Profiles & Dietary Constraints
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.platform_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER DEFAULT 21,
    sex TEXT DEFAULT 'male',
    height_cm NUMERIC(5, 2) NOT NULL DEFAULT 175.5,
    current_weight_kg NUMERIC(5, 2) NOT NULL DEFAULT 75.0,
    target_weight_kg NUMERIC(5, 2) DEFAULT 75.0,
    fitness_goal TEXT DEFAULT 'recomposition',
    activity_level TEXT DEFAULT 'moderate',
    foods_avoided TEXT[] DEFAULT '{}',
    preferred_dinner_cutoff TEXT DEFAULT '19:00',
    cooking_ability TEXT DEFAULT 'home_food',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id)
);

-- 3. Food Diary Entries (Every logged food item)
CREATE TABLE IF NOT EXISTS public.food_log_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.platform_users(id) ON DELETE CASCADE,
    diary_date DATE NOT NULL,
    meal_category TEXT NOT NULL,
    food_name TEXT NOT NULL,
    quantity NUMERIC(7, 2) NOT NULL,
    unit TEXT NOT NULL,
    preparation_method TEXT,
    is_cooked BOOLEAN DEFAULT true,
    is_estimated BOOLEAN DEFAULT false,
    confidence_label TEXT DEFAULT 'verified',
    data_source TEXT DEFAULT 'USDA',
    calories NUMERIC(7, 2) NOT NULL,
    protein_g NUMERIC(6, 2) NOT NULL,
    carbs_g NUMERIC(6, 2) NOT NULL,
    fat_g NUMERIC(6, 2) NOT NULL,
    fibre_g NUMERIC(6, 2) NOT NULL,
    consumed_at TIMESTAMPTZ NOT NULL,
    idempotency_key TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Daily Water Tracking Logs
CREATE TABLE IF NOT EXISTS public.daily_water_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.platform_users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    amount_ml NUMERIC(7, 2) NOT NULL,
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Body Weight & Waist Measurements
CREATE TABLE IF NOT EXISTS public.weight_measurements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.platform_users(id) ON DELETE CASCADE,
    measured_date DATE NOT NULL,
    weight_kg NUMERIC(5, 2) NOT NULL,
    waist_cm NUMERIC(5, 2),
    body_fat_pct NUMERIC(4, 2),
    notes TEXT,
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Exercise & Workout Sessions
CREATE TABLE IF NOT EXISTS public.exercise_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.platform_users(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    exercise_name TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    distance_km NUMERIC(5, 2),
    steps INTEGER,
    estimated_calories_burned NUMERIC(7, 2) NOT NULL,
    is_calorie_estimate BOOLEAN DEFAULT true,
    notes TEXT,
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. User Preferences & Cutoff Timers
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.platform_users(id) ON DELETE CASCADE,
    cutoffs JSONB NOT NULL DEFAULT '{"early_morning": "07:30", "breakfast": "09:30", "mid_morning_snack": "11:30", "lunch": "14:00", "evening_snack": "17:30", "pre_workout": "17:00", "post_workout": "19:00", "dinner": "19:00", "other": "21:30"}'::jsonb,
    foods_avoided TEXT[] DEFAULT '{}',
    dietary_notes TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id)
);

-- 8. Nutrition Goals & Targets
CREATE TABLE IF NOT EXISTS public.nutrition_goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.platform_users(id) ON DELETE CASCADE,
    calories NUMERIC(7, 2) NOT NULL DEFAULT 2400.00,
    protein_g NUMERIC(6, 2) NOT NULL DEFAULT 150.00,
    carbs_g NUMERIC(6, 2) NOT NULL DEFAULT 290.00,
    fat_g NUMERIC(6, 2) NOT NULL DEFAULT 70.00,
    fibre_g NUMERIC(6, 2) NOT NULL DEFAULT 35.00,
    water_ml NUMERIC(7, 2) NOT NULL DEFAULT 3000.00,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_food_log_user_date ON public.food_log_entries(user_id, diary_date);
CREATE INDEX IF NOT EXISTS idx_water_user_date ON public.daily_water_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_weight_user_date ON public.weight_measurements(user_id, measured_date);
CREATE INDEX IF NOT EXISTS idx_exercise_user_date ON public.exercise_sessions(user_id, session_date);

-- Enable RLS on all tables
ALTER TABLE public.platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_goals ENABLE ROW LEVEL SECURITY;

-- Grant API roles permission to query and mutate tables
GRANT ALL ON public.platform_users TO anon, authenticated, service_role;
GRANT ALL ON public.user_profiles TO anon, authenticated, service_role;
GRANT ALL ON public.food_log_entries TO anon, authenticated, service_role;
GRANT ALL ON public.daily_water_logs TO anon, authenticated, service_role;
GRANT ALL ON public.weight_measurements TO anon, authenticated, service_role;
GRANT ALL ON public.exercise_sessions TO anon, authenticated, service_role;
GRANT ALL ON public.user_preferences TO anon, authenticated, service_role;
GRANT ALL ON public.nutrition_goals TO anon, authenticated, service_role;

-- Policies allowing authenticated & anon client API access
CREATE POLICY "Public user access" ON public.platform_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public profile access" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public food log access" ON public.food_log_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public water log access" ON public.daily_water_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public weight access" ON public.weight_measurements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public exercise access" ON public.exercise_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public preferences access" ON public.user_preferences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public goals access" ON public.nutrition_goals FOR ALL USING (true) WITH CHECK (true);

-- Seed Initial Default Accounts
INSERT INTO public.platform_users (id, name, username, email, password_hash, role, is_onboarded, usage_timing_habit)
VALUES 
    ('usr-admin-primary', 'Primary Administrator', 'admin', 'admin@health.local', 'hash_36ff9ce', 'primary_admin', true, 'System Management (Daily)'),
    ('usr-sarveswar-primary', 'Sarveswar', 'sarveswar', 'sarveswar@health.local', 'hash_5ec85a53', 'user', true, 'Breakfast (08:30) & Dinner (18:45 IST)')
ON CONFLICT (id) DO NOTHING;

-- Seed Sarveswar Profile Defaults
INSERT INTO public.user_profiles (id, user_id, name, current_weight_kg, target_weight_kg, foods_avoided, preferred_dinner_cutoff)
VALUES ('prof-sarveswar', 'usr-sarveswar-primary', 'Sarveswar', 75.0, 75.0, ARRAY['whey protein', 'squid'], '19:00')
ON CONFLICT (user_id) DO NOTHING;
